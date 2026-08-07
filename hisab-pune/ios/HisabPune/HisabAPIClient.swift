import Foundation

enum IssueCategory: String, CaseIterable, Identifiable, Codable {
    case solidWaste = "solid_waste"
    case drainageFlood = "drainage_flood"
    case roadsFootpath = "roads_footpath"
    case streetlight = "streetlight"
    case waterSupply = "water_supply"
    case encroachment = "encroachment"
    case parksTrees = "parks_trees"
    case strayAnimals = "stray_animals"
    case other = "other"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .solidWaste: return "Solid waste / blackspot"
        case .drainageFlood: return "Drainage / flooding"
        case .roadsFootpath: return "Roads / footpath"
        case .streetlight: return "Streetlight"
        case .waterSupply: return "Water supply"
        case .encroachment: return "Encroachment"
        case .parksTrees: return "Parks / trees"
        case .strayAnimals: return "Stray animals"
        case .other: return "Other civic issue"
        }
    }
}

struct APISessionResponse: Decodable {
    var sessionToken: String
    var anonymousPostingId: String
    var publicDisplayId: String?
}

struct APIReport: Decodable, Identifiable {
    var id: String
    var locality_id: String?
    var note: String
    var status: String
    var created_at: String
    var category_id: String?
    var author_label: String?
    var publish_as: String?
    var gov_ticket_id: String?
}

struct APILocality: Decodable, Identifiable, Hashable {
    var id: String
    var name: String
    var electoralWardId: Int
    var wardOfficeId: String?
    var assemblyId: String?
    var lat: Double
    var lng: Double
    var zone: String?
}

struct APIEscalationPerson: Decodable, Identifiable, Hashable {
    var id: String
    var name: String
    var role: String
    var shortTitle: String
    var title: String?
    var xHandle: String?
    var phone: String?
    var email: String?
}

struct APICareLinks: Decodable {
    var portal: String
    var whatsapp: String
}

enum HisabAPIError: LocalizedError {
    case badStatus(Int, String?)
    case decoding

    var errorDescription: String? {
        switch self {
        case .badStatus(let code, let body):
            if let body, !body.isEmpty { return "API \(code): \(body)" }
            return "API error (\(code))"
        case .decoding:
            return "Could not read API response"
        }
    }
}

struct HisabAPIClient {
    var baseURL: URL

    func createSession() async throws -> APISessionResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("v1/auth/session"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data("{}".utf8)
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        do {
            return try JSONDecoder().decode(APISessionResponse.self, from: data)
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func resolveHere(lat: Double, lng: Double) async throws -> HereSnapshot {
        try await HereAPIClient(baseURL: baseURL).resolve(lat: lat, lng: lng)
    }

    func localityReports(localityId: String, sessionToken: String?) async throws -> [APIReport] {
        let url = baseURL.appendingPathComponent("v1/localities/\(localityId)/reports")
        var req = URLRequest(url: url)
        if let sessionToken {
            req.setValue(sessionToken, forHTTPHeaderField: "X-Hisab-Session")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        struct Wrap: Decodable { var reports: [APIReport] }
        do {
            return try JSONDecoder().decode(Wrap.self, from: data).reports
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func createReport(
        lat: Double,
        lng: Double,
        note: String,
        category: IssueCategory,
        localityId: String?,
        sessionToken: String
    ) async throws -> APIReport {
        var req = URLRequest(url: baseURL.appendingPathComponent("v1/reports"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(sessionToken, forHTTPHeaderField: "X-Hisab-Session")
        var body: [String: Any] = [
            "lat": lat,
            "lng": lng,
            "note": note,
            "categoryId": category.rawValue,
            "publishAs": "anonymous",
        ]
        if let localityId { body["localityId"] = localityId }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        struct Wrap: Decodable { var report: APIReport }
        do {
            return try JSONDecoder().decode(Wrap.self, from: data).report
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func listLocalities() async throws -> [APILocality] {
        let req = URLRequest(url: baseURL.appendingPathComponent("v1/localities"))
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        struct Wrap: Decodable { var localities: [APILocality] }
        do {
            return try JSONDecoder().decode(Wrap.self, from: data).localities
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func localityDetail(id: String) async throws -> (APILocality, [APIEscalationPerson]) {
        let req = URLRequest(url: baseURL.appendingPathComponent("v1/localities/\(id)"))
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        struct Wrap: Decodable {
            var locality: APILocality
            var escalation: [APIEscalationPerson]
        }
        do {
            let decoded = try JSONDecoder().decode(Wrap.self, from: data)
            return (decoded.locality, decoded.escalation)
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func careLinks(reportId: String) async throws -> APICareLinks {
        var req = URLRequest(url: baseURL.appendingPathComponent("v1/reports/\(reportId)/escalate-gov"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data("{}".utf8)
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
        struct Wrap: Decodable { var care: APICareLinks }
        do {
            return try JSONDecoder().decode(Wrap.self, from: data).care
        } catch {
            throw HisabAPIError.decoding
        }
    }

    func attachGovTicket(reportId: String, externalId: String, sessionToken: String) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("v1/reports/\(reportId)/gov-ticket"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(sessionToken, forHTTPHeaderField: "X-Hisab-Session")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "externalId": externalId,
            "channel": "pmc_care",
        ])
        let (data, response) = try await URLSession.shared.data(for: req)
        try Self.throwIfNeeded(data: data, response: response, ok: 200..<300)
    }

    private static func throwIfNeeded(data: Data, response: URLResponse, ok: Range<Int>) throws {
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard ok.contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8)
            throw HisabAPIError.badStatus(http.statusCode, body)
        }
    }
}
