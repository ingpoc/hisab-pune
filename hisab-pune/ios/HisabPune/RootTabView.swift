import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            HereView()
                .tabItem { Label("Here", systemImage: "location.fill") }
                .accessibilityIdentifier("tab.here")
            ReportComposerView()
                .tabItem { Label("Report", systemImage: "plus.circle.fill") }
                .accessibilityIdentifier("tab.report")
            AboutView()
                .tabItem { Label("About", systemImage: "info.circle") }
                .accessibilityIdentifier("tab.about")
        }
        .tint(Color("AccentColor"))
        .accessibilityIdentifier("root.tabs")
    }
}

struct AboutView: View {
    @EnvironmentObject private var session: AppSession
    @State private var apiField = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Hisab") {
                    Text("Who answers for your street?")
                        .font(.title3.weight(.semibold))
                    Text("Posts use your anonymous id by default. Login identity stays private.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let anon = session.anonymousPostingId {
                    Section("You post as") {
                        Text(anon)
                            .font(.body.monospaced())
                            .accessibilityIdentifier("about.anonymousId")
                    }
                }

                Section("API") {
                    TextField("Base URL", text: $apiField)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                        .accessibilityIdentifier("about.apiField")
                    Button("Save API URL") {
                        let trimmed = apiField.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard let url = URL(string: trimmed), !trimmed.isEmpty else { return }
                        session.setBaseURL(url)
                    }
                    .accessibilityIdentifier("about.saveApi")
                    Text(session.baseURL.absoluteString)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("about.apiURL")
                }

                Section("Web") {
                    Link(
                        "Open Hisab web",
                        destination: URL(string: "http://127.0.0.1:5173")!
                    )
                }
            }
            .navigationTitle("Hisab")
            .onAppear { apiField = session.baseURL.absoluteString }
        }
    }
}
