import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            HereView()
                .tabItem { Label("Here", systemImage: "location.fill") }
                .accessibilityIdentifier("tab.here")
            MapBrowseView()
                .tabItem { Label("Map", systemImage: "map") }
                .accessibilityIdentifier("tab.map")
            ReportComposerView()
                .tabItem { Label("Report", systemImage: "plus.circle.fill") }
                .accessibilityIdentifier("tab.report")
            LocalitiesBrowseView()
                .tabItem { Label("Localities", systemImage: "list.bullet") }
                .accessibilityIdentifier("tab.localities")
            AboutView()
                .tabItem { Label("About", systemImage: "info.circle") }
                .accessibilityIdentifier("tab.about")
        }
        .tint(HisabTheme.brand)
        .accessibilityIdentifier("root.tabs")
    }
}

struct AboutView: View {
    @EnvironmentObject private var session: AppSession
    @State private var apiField = ""
    @State private var travelMode = false

    var body: some View {
        NavigationStack {
            List {
                Section("Hisab") {
                    Text("Who answers for your street?")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(HisabTheme.ink)
                    Text("Posts use your anonymous id by default. Login identity stays private.")
                        .font(.footnote)
                        .foregroundStyle(HisabTheme.mist)
                }
                .listRowBackground(HisabTheme.paperElevated)

                if let anon = session.anonymousPostingId {
                    Section("You post as") {
                        Text(anon)
                            .font(.body.monospaced())
                            .foregroundStyle(HisabTheme.ink)
                            .accessibilityIdentifier("about.anonymousId")
                    }
                    .listRowBackground(HisabTheme.paperElevated)
                }

                Section {
                    Toggle("Travel mode (Live Activity)", isOn: $travelMode)
                    Text(
                        travelMode
                            ? "Live Activity will show locality orientation while travelling. Full ActivityKit shipping next — toggle remembers intent."
                            : "Orientation only while you move across Pune — not a breadcrumb trail."
                    )
                    .font(.caption)
                    .foregroundStyle(HisabTheme.mist)
                } header: {
                    Text("Location")
                }
                .listRowBackground(HisabTheme.paperElevated)

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
                    .foregroundStyle(HisabTheme.brand)
                    .accessibilityIdentifier("about.saveApi")
                    Text(session.baseURL.absoluteString)
                        .font(.caption.monospaced())
                        .foregroundStyle(HisabTheme.mist)
                        .accessibilityIdentifier("about.apiURL")
                }
                .listRowBackground(HisabTheme.paperElevated)

                Section("Web") {
                    Link(
                        "Open Hisab web",
                        destination: URL(string: "http://127.0.0.1:5173")!
                    )
                    .foregroundStyle(HisabTheme.brand)
                }
                .listRowBackground(HisabTheme.paperElevated)
            }
            .scrollContentBackground(.hidden)
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("Hisab")
            .toolbarBackground(HisabTheme.paper, for: .navigationBar)
            .onAppear { apiField = session.baseURL.absoluteString }
        }
    }
}
