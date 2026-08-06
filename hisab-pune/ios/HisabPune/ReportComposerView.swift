import SwiftUI

struct ReportComposerView: View {
    @EnvironmentObject private var session: AppSession
    @EnvironmentObject private var location: LocationModel
    @State private var note = ""
    @State private var category: IssueCategory = .solidWaste
    @State private var resolvedLocality: String?
    @State private var status: String?
    @State private var submitting = false

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Place") {
                    if let resolvedLocality {
                        Text(resolvedLocality)
                            .font(.body.weight(.medium))
                    } else {
                        Text(location.usingFallback
                            ? "Baner (fallback until GPS)"
                            : "Resolving locality…")
                            .foregroundStyle(.secondary)
                    }
                    Button("Refresh location") {
                        location.request()
                        Task { await resolvePlace() }
                    }
                }

                Section("Type") {
                    Picker("Issue type", selection: $category) {
                        ForEach(IssueCategory.allCases) { cat in
                            Text(cat.label).tag(cat)
                        }
                    }
                }

                Section("What is wrong?") {
                    TextField("Short factual note", text: $note, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section {
                    Text("Posted as \(session.anonymousPostingId ?? "…") by default.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let status {
                    Section { Text(status) }
                }

                Section {
                    Button(submitting ? "Saving…" : "Pin issue") {
                        Task { await submit() }
                    }
                    .disabled(submitting || note.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                }
            }
            .navigationTitle("Report")
            .task {
                location.request()
                try? await session.ensureSession(client: client)
                await resolvePlace()
            }
            .onChange(of: location.coordinate?.latitude) { _, _ in
                Task { await resolvePlace() }
            }
        }
    }

    private func resolvePlace() async {
        let coord = location.effectiveCoordinate
        do {
            let snap = try await client.resolveHere(lat: coord.latitude, lng: coord.longitude)
            resolvedLocality = "\(snap.localityName) · Ward \(snap.wardId)"
            snap.saveToAppGroup()
        } catch {
            resolvedLocality = nil
        }
    }

    private func submit() async {
        submitting = true
        defer { submitting = false }
        do {
            try await session.ensureSession(client: client)
            guard let token = session.sessionToken else { return }
            let coord = location.effectiveCoordinate
            let snap = try await client.resolveHere(lat: coord.latitude, lng: coord.longitude)
            let report = try await client.createReport(
                lat: coord.latitude,
                lng: coord.longitude,
                note: note.trimmingCharacters(in: .whitespacesAndNewlines),
                category: category,
                localityId: snap.localityId,
                sessionToken: token
            )
            status = "Saved \(report.id) as \(report.author_label ?? "anonymous")"
            note = ""
            resolvedLocality = "\(snap.localityName) · Ward \(snap.wardId)"
            snap.saveToAppGroup()
        } catch {
            status = error.localizedDescription
        }
    }
}
