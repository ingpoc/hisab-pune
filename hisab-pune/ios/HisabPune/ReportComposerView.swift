import SwiftUI

struct ReportComposerView: View {
    @EnvironmentObject private var session: AppSession
    @EnvironmentObject private var location: LocationModel
    @State private var note = ""
    @State private var category: IssueCategory = .solidWaste
    @State private var resolvedLocality: String?
    @State private var status: String?
    @State private var submitting = false
    @State private var saved = false

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    var body: some View {
        NavigationStack {
            Form {
                if saved, let status {
                    Section {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Issue pinned")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(HisabTheme.ink)
                            Text(status)
                                .font(.subheadline)
                                .foregroundStyle(HisabTheme.mist)
                                .accessibilityIdentifier("report.status")
                            Button("Report another") {
                                saved = false
                                self.status = nil
                            }
                            .buttonStyle(HisabPrimaryButtonStyle())
                        }
                        .padding(.vertical, 4)
                        .listRowBackground(HisabTheme.paper)
                    }
                } else {
                    Section("Place") {
                        if let resolvedLocality {
                            Text(resolvedLocality)
                                .font(.body.weight(.medium))
                                .foregroundStyle(HisabTheme.ink)
                                .accessibilityIdentifier("report.place")
                        } else {
                            Text(location.usingFallback
                                ? "Baner (fallback until GPS)"
                                : "Resolving locality…")
                                .foregroundStyle(HisabTheme.mist)
                                .accessibilityIdentifier("report.place")
                        }
                        Button("Refresh location") {
                            location.request()
                            Task { await resolvePlace() }
                        }
                        .foregroundStyle(HisabTheme.brand)
                        .accessibilityIdentifier("report.refreshLocation")
                    }
                    .listRowBackground(HisabTheme.paperElevated)

                    Section("Type") {
                        Picker("Issue type", selection: $category) {
                            ForEach(IssueCategory.allCases) { cat in
                                Text(cat.label).tag(cat)
                            }
                        }
                        .accessibilityIdentifier("report.category")
                    }
                    .listRowBackground(HisabTheme.paperElevated)

                    Section("What is wrong?") {
                        TextField("Short factual note", text: $note, axis: .vertical)
                            .lineLimit(3...6)
                            .accessibilityIdentifier("report.note")
                    }
                    .listRowBackground(HisabTheme.paperElevated)

                    Section {
                        Text("Posted as \(session.anonymousPostingId ?? "…") by default.")
                            .font(.footnote)
                            .foregroundStyle(HisabTheme.mist)
                    }
                    .listRowBackground(HisabTheme.paper)

                    if let status {
                        Section {
                            Text(status)
                                .foregroundStyle(HisabTheme.brand)
                                .accessibilityIdentifier("report.status")
                        }
                        .listRowBackground(HisabTheme.paper)
                    }

                    Section {
                        Button(submitting ? "Saving…" : "Pin issue") {
                            Task { await submit() }
                        }
                        .disabled(submitting || note.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(
                            note.trimmingCharacters(in: .whitespacesAndNewlines).count < 3
                                ? HisabTheme.mist
                                : HisabTheme.brand
                        )
                        .accessibilityIdentifier("report.submit")
                    }
                    .listRowBackground(HisabTheme.paperElevated)
                }
            }
            .scrollContentBackground(.hidden)
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("Report")
            .toolbarBackground(HisabTheme.paper, for: .navigationBar)
            .accessibilityIdentifier("report.screen")
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
            saved = true
        } catch {
            status = error.localizedDescription
            saved = false
        }
    }
}
