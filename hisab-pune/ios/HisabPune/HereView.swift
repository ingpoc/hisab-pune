import SwiftUI

struct HereView: View {
    @EnvironmentObject private var session: AppSession
    @EnvironmentObject private var location: LocationModel
    @State private var snapshot: HereSnapshot?
    @State private var reports: [APIReport] = []
    @State private var errorText: String?
    @State private var loading = false
    @State private var ledgerTab: LedgerTab = .open

    private enum LedgerTab: String, CaseIterable {
        case open = "Open"
        case closed = "Closed"
    }

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    private var openReports: [APIReport] {
        reports.filter { $0.status != "resolved" }
            .sorted { $0.created_at > $1.created_at }
    }

    private var closedReports: [APIReport] {
        reports.filter { $0.status == "resolved" }
            .sorted { $0.created_at > $1.created_at }
    }

    private var visibleReports: [APIReport] {
        ledgerTab == .open ? openReports : closedReports
    }

    var body: some View {
        NavigationStack {
            Group {
                if let snapshot {
                    ledgerList(snapshot)
                } else if loading {
                    ProgressView("Resolving ward…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(HisabTheme.paper)
                } else {
                    locationNeeded
                }
            }
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("Here")
            .navigationBarTitleDisplayMode(.large)
            .accessibilityIdentifier("here.screen")
            .toolbarBackground(HisabTheme.paper, for: .navigationBar)
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

    private var locationNeeded: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Use location to see who answers here.")
                .font(.title3.weight(.semibold))
                .foregroundStyle(HisabTheme.ink)
            Text("Hisab resolves your Pune locality, open issues, and the escalation route — without a breadcrumb trail.")
                .font(.subheadline)
                .foregroundStyle(HisabTheme.mist)
            Button("Use my location") {
                location.request()
                Task { await refresh() }
            }
            .buttonStyle(HisabPrimaryButtonStyle())
            .accessibilityIdentifier("here.useLocation")
            if let errorText {
                Text(errorText)
                    .font(.footnote)
                    .foregroundStyle(HisabTheme.brand)
                    .accessibilityIdentifier("here.error")
            }
            Spacer()
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func ledgerList(_ snapshot: HereSnapshot) -> some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text("LOCALITY")
                        .font(.caption2.weight(.semibold))
                        .tracking(1.2)
                        .foregroundStyle(HisabTheme.mist)
                    Text(snapshot.localityName)
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(HisabTheme.ink)
                        .accessibilityIdentifier("here.localityName")
                    Text("Ward \(snapshot.wardId)")
                        .font(.subheadline)
                        .foregroundStyle(HisabTheme.mist)
                        .accessibilityIdentifier("here.ward")
                    Text("\(openReports.count) open · \(closedReports.count) closed")
                        .font(.subheadline.weight(.medium).monospacedDigit())
                        .foregroundStyle(HisabTheme.ink)
                        .padding(.top, 2)
                    if location.usingFallback {
                        Text("Using Baner fallback until GPS arrives.")
                            .font(.caption)
                            .foregroundStyle(HisabTheme.mist)
                    }
                }
                .listRowBackground(HisabTheme.paper)
                .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 8, trailing: 16))
            }

            Section {
                Picker("Ledger", selection: $ledgerTab) {
                    ForEach(LedgerTab.allCases, id: \.self) { tab in
                        Text(tab == .open
                            ? "Open \(openReports.count)"
                            : "Closed \(closedReports.count)"
                        ).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(HisabTheme.paper)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }

            Section {
                if visibleReports.isEmpty {
                    Text(ledgerTab == .open ? "No open issues here yet." : "No closed issues yet.")
                        .foregroundStyle(HisabTheme.mist)
                        .listRowBackground(HisabTheme.paper)
                } else {
                    ForEach(visibleReports) { report in
                        NavigationLink {
                            IssueDetailView(
                                report: report,
                                localityName: snapshot.localityName,
                                wardId: snapshot.wardId,
                                people: Array(snapshot.people)
                            )
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 8) {
                                    StatusPill(status: report.status)
                                    Text(
                                        IssueCategory(rawValue: report.category_id ?? "")?.label
                                            ?? "Civic issue"
                                    )
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(HisabTheme.mist)
                                }
                                Text(report.note)
                                    .font(.body)
                                    .foregroundStyle(HisabTheme.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                                HStack(spacing: 8) {
                                    Text(report.author_label ?? "Resident")
                                    Text("·")
                                    Text(IssueAgeLabel.text(createdAt: report.created_at, status: report.status))
                                }
                                .font(.caption)
                                .foregroundStyle(HisabTheme.mist)
                            }
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(HisabTheme.paperElevated)
                    }
                }
            } header: {
                Text(ledgerTab == .open ? "Open issues" : "Closed issues")
            }

            Section("Who answers here") {
                ForEach(snapshot.people.prefix(4), id: \.name) { person in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(person.shortTitle)
                            .font(.caption)
                            .foregroundStyle(HisabTheme.mist)
                        Text(person.name)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(HisabTheme.ink)
                            .lineLimit(2)
                    }
                    .padding(.vertical, 2)
                    .listRowBackground(HisabTheme.paper)
                }
                NavigationLink {
                    EscalationView(
                        localityName: snapshot.localityName,
                        people: Array(snapshot.people)
                    )
                } label: {
                    Text("Full escalation route")
                        .fontWeight(.semibold)
                        .foregroundStyle(HisabTheme.brand)
                }
                .listRowBackground(HisabTheme.paper)
            }

            if let errorText {
                Section {
                    Text(errorText)
                        .foregroundStyle(HisabTheme.brand)
                        .accessibilityIdentifier("here.error")
                        .accessibilityLabel(errorText)
                        .listRowBackground(HisabTheme.paper)
                }
            }

            if let anon = session.anonymousPostingId {
                Section("You post as") {
                    Text(anon)
                        .font(.body.monospaced())
                        .foregroundStyle(HisabTheme.ink)
                        .accessibilityIdentifier("here.anonymousId")
                        .accessibilityLabel(anon)
                        .listRowBackground(HisabTheme.paper)
                }
            }

            Section {
                Button("Refresh location") {
                    location.request()
                    Task { await refresh() }
                }
                .accessibilityIdentifier("here.useLocation")
                .listRowBackground(HisabTheme.paper)
            }
        }
        .scrollContentBackground(.hidden)
        .listStyle(.insetGrouped)
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

struct HisabPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(HisabTheme.brand.opacity(configuration.isPressed ? 0.88 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }
}
