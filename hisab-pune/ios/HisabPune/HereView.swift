import SwiftUI

struct HereView: View {
    @EnvironmentObject private var session: AppSession
    @EnvironmentObject private var location: LocationModel
    @State private var snapshot: HereSnapshot?
    @State private var reports: [APIReport] = []
    @State private var errorText: String?
    @State private var loading = false

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    var body: some View {
        NavigationStack {
            List {
                Section("Your place") {
                    if let snapshot {
                        Text(snapshot.localityName)
                            .font(.title2.weight(.bold))
                            .accessibilityIdentifier("here.localityName")
                        Text("Ward \(snapshot.wardId)")
                            .foregroundStyle(.secondary)
                            .accessibilityIdentifier("here.ward")
                        ForEach(snapshot.people.prefix(4), id: \.name) { person in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(person.shortTitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(person.name)
                                    .font(.subheadline)
                                    .lineLimit(2)
                            }
                            .padding(.vertical, 2)
                        }
                        if location.usingFallback {
                            Text("Using Baner fallback until GPS arrives.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else if loading {
                        ProgressView("Resolving ward…")
                    } else {
                        Text("Use location to see who answers here.")
                            .foregroundStyle(.secondary)
                    }
                    Button("Use my location") {
                        location.request()
                        Task { await refresh() }
                    }
                    .accessibilityIdentifier("here.useLocation")
                }

                if let snapshot {
                    Section("Open issues nearby") {
                        if reports.isEmpty {
                            Text("No open issues loaded.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(reports) { report in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(IssueCategory(rawValue: report.category_id ?? "")?.label
                                        ?? "Civic issue")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text(report.note)
                                    HStack {
                                        Text(report.author_label ?? "Resident")
                                        if report.status != "open" {
                                            Text("· \(report.status)")
                                        }
                                    }
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                if let errorText {
                    Section {
                        Text(errorText)
                            .foregroundStyle(.red)
                            .accessibilityIdentifier("here.error")
                            .accessibilityLabel(errorText)
                    }
                }

                if let anon = session.anonymousPostingId {
                    Section("You post as") {
                        Text(anon)
                            .font(.body.monospaced())
                            .accessibilityIdentifier("here.anonymousId")
                            .accessibilityLabel(anon)
                    }
                }
            }
            .navigationTitle("Here")
            .accessibilityIdentifier("here.screen")
            .refreshable { await refresh() }
            .task {
                location.request()
                try? await session.ensureSession(client: client)
                await refresh()
            }
            .onChange(of: location.coordinate?.latitude) { _, _ in
                Task { await refresh() }
            }
        }
    }

    private func refresh() async {
        loading = true
        errorText = nil
        defer { loading = false }
        let coord = location.effectiveCoordinate
        do {
            try await session.ensureSession(client: client)
            let snap = try await client.resolveHere(lat: coord.latitude, lng: coord.longitude)
            snap.saveToAppGroup()
            snapshot = snap
            reports = try await client.localityReports(
                localityId: snap.localityId,
                sessionToken: session.sessionToken
            )
        } catch {
            errorText = error.localizedDescription
        }
    }
}
