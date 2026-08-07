import Foundation

/// Mirrors API `GET /v1/here` widget payload. English-only.
public struct HereSnapshot: Codable, Equatable {
    public struct Person: Codable, Equatable {
        public var role: String
        public var shortTitle: String
        public var name: String

        public init(role: String, shortTitle: String, name: String) {
            self.role = role
            self.shortTitle = shortTitle
            self.name = name
        }
    }

    public var localityName: String
    public var localityId: String
    public var wardId: Int
    public var people: [Person]
    public var resolvedAt: Date
    public var boundaryVersion: String

    public static let appGroupId = "group.in.hisab.pune"
    public static let storageKey = "here.snapshot"

    public func saveToAppGroup() {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId),
              let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }

    public static func loadFromAppGroup() -> HereSnapshot? {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let data = defaults.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(HereSnapshot.self, from: data)
    }
}

public struct HereAPIClient {
    public var baseURL: URL

    public init(baseURL: URL = URL(string: "https://api.hisab.pune")!) {
        self.baseURL = baseURL
    }

    public func resolve(lat: Double, lng: Double) async throws -> HereSnapshot {
        var comps = URLComponents(url: baseURL.appendingPathComponent("v1/here"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "lat", value: String(lat)),
            URLQueryItem(name: "lng", value: String(lng)),
        ]
        let (data, response) = try await URLSession.shared.data(from: comps.url!)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            let body = String(data: data, encoding: .utf8)
            throw HereAPIFailure(status: code, body: body)
        }
        let decoded = try JSONDecoder().decode(APIHere.self, from: data)
        return HereSnapshot(
            localityName: decoded.widget.localityName,
            localityId: decoded.locality.id,
            wardId: decoded.widget.wardId,
            people: decoded.widget.people.map {
                .init(role: $0.role, shortTitle: $0.shortTitle, name: $0.name)
            },
            resolvedAt: ISO8601DateFormatter().date(from: decoded.resolvedAt) ?? Date(),
            boundaryVersion: decoded.boundaryVersion
        )
    }
}

public struct HereAPIFailure: Error, LocalizedError, Sendable {
    public var status: Int
    public var body: String?

    public init(status: Int, body: String?) {
        self.status = status
        self.body = body
    }

    public var errorDescription: String? {
        if let body,
           let data = body.data(using: .utf8),
           let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let err = obj["error"] as? String
        {
            return err
        }
        if let body, !body.isEmpty { return body }
        return "Here API failed (\(status))"
    }
}

private struct APIHere: Decodable {
    struct Locality: Decodable {
        var id: String
        var name: String
    }
    struct Widget: Decodable {
        var localityName: String
        var wardId: Int
        var people: [HereSnapshot.Person]
    }
    var locality: Locality
    var widget: Widget
    var resolvedAt: String
    var boundaryVersion: String
}
