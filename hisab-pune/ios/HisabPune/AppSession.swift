import Foundation
import Combine

@MainActor
final class AppSession: ObservableObject {
    @Published var sessionToken: String?
    @Published var anonymousPostingId: String?
    @Published var baseURL: URL

    private static let tokenKey = "hisab.sessionToken"
    private static let anonKey = "hisab.anonymousPostingId"
    private static let baseURLKey = "hisab.baseURL"

    init(baseURL: URL? = nil) {
        if let baseURL {
            self.baseURL = baseURL
        } else if let stored = UserDefaults.standard.string(forKey: Self.baseURLKey),
                  let url = URL(string: stored)
        {
            self.baseURL = url
        } else if let plist = Bundle.main.object(forInfoDictionaryKey: "HisabAPIBaseURL") as? String,
                  let url = URL(string: plist)
        {
            self.baseURL = url
        } else {
            self.baseURL = URL(string: "http://127.0.0.1:8787")!
        }

        if let token = UserDefaults.standard.string(forKey: Self.tokenKey) {
            sessionToken = token
            anonymousPostingId = UserDefaults.standard.string(forKey: Self.anonKey)
        }
    }

    func setBaseURL(_ url: URL) {
        baseURL = url
        UserDefaults.standard.set(url.absoluteString, forKey: Self.baseURLKey)
        // New host → new session
        clearSession()
    }

    func clearSession() {
        sessionToken = nil
        anonymousPostingId = nil
        UserDefaults.standard.removeObject(forKey: Self.tokenKey)
        UserDefaults.standard.removeObject(forKey: Self.anonKey)
    }

    func ensureSession(client: HisabAPIClient) async throws {
        if sessionToken != nil { return }
        let created = try await client.createSession()
        sessionToken = created.sessionToken
        anonymousPostingId = created.anonymousPostingId
        UserDefaults.standard.set(created.sessionToken, forKey: Self.tokenKey)
        UserDefaults.standard.set(created.anonymousPostingId, forKey: Self.anonKey)
    }
}
