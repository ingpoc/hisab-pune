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

    var effectiveCoordinate: CLLocationCoordinate2D {
        coordinate ?? Self.fallbackCoordinate
    }

    var usingFallback: Bool { coordinate == nil }

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        authStatus = manager.authorizationStatus
    }

    func request() {
        lastError = nil
        manager.requestWhenInUseAuthorization()
        if authStatus == .authorizedWhenInUse || authStatus == .authorizedAlways {
            manager.requestLocation()
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authStatus = manager.authorizationStatus
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
            self.coordinate = loc.coordinate
            self.lastError = nil
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.lastError = error.localizedDescription
        }
    }
}
