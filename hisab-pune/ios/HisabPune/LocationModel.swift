import CoreLocation
import Combine

@MainActor
final class LocationModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    /// Baner centroid — used until GPS arrives (inside API Pune bounds).
    static let fallbackCoordinate = CLLocationCoordinate2D(latitude: 18.559, longitude: 73.7867)

    @Published var coordinate: CLLocationCoordinate2D?
    @Published var authStatus: CLAuthorizationStatus = .notDetermined
    @Published var lastError: String?

    private let manager = CLLocationManager()

    /// Set via launch environment `HISAB_FORCE_LAT` / `HISAB_FORCE_LNG` (UI tests).
    private var forcedCoordinate: CLLocationCoordinate2D?

    var effectiveCoordinate: CLLocationCoordinate2D {
        coordinate ?? Self.fallbackCoordinate
    }

    var usingFallback: Bool { coordinate == nil && forcedCoordinate == nil }

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        authStatus = manager.authorizationStatus
        forcedCoordinate = Self.parseForcedCoordinate()
        if let forcedCoordinate {
            coordinate = forcedCoordinate
        }
    }

    func request() {
        lastError = nil
        if let forcedCoordinate {
            // Re-publish so views refresh even when the value is unchanged.
            coordinate = nil
            coordinate = forcedCoordinate
            return
        }
        manager.requestWhenInUseAuthorization()
        if authStatus == .authorizedWhenInUse || authStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authStatus = manager.authorizationStatus
            if self.forcedCoordinate != nil { return }
            if manager.authorizationStatus == .authorizedWhenInUse
                || manager.authorizationStatus == .authorizedAlways
            {
                manager.requestLocation()
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        Task { @MainActor in
            if self.forcedCoordinate != nil { return }
            self.coordinate = loc.coordinate
            self.lastError = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            if self.forcedCoordinate != nil { return }
            self.lastError = error.localizedDescription
        }
    }

    private static func parseForcedCoordinate() -> CLLocationCoordinate2D? {
        let env = ProcessInfo.processInfo.environment
        if let lat = env["HISAB_FORCE_LAT"].flatMap(Double.init),
           let lng = env["HISAB_FORCE_LNG"].flatMap(Double.init)
        {
            return CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }
        let args = ProcessInfo.processInfo.arguments
        if let latIdx = args.firstIndex(of: "-forceLat"),
           latIdx + 1 < args.count,
           let lngIdx = args.firstIndex(of: "-forceLng"),
           lngIdx + 1 < args.count,
           let lat = Double(args[latIdx + 1]),
           let lng = Double(args[lngIdx + 1])
        {
            return CLLocationCoordinate2D(latitude: lat, longitude: lng)
        }
        return nil
    }
}
