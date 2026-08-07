import MapKit
import SwiftUI

struct MapBrowseView: View {
    @EnvironmentObject private var session: AppSession
    @EnvironmentObject private var location: LocationModel

    @State private var localities: [APILocality] = []
    @State private var selected: APILocality?
    @State private var reports: [APIReport] = []
    @State private var people: [APIEscalationPerson] = []
    @State private var camera: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 18.5204, longitude: 73.8567),
            span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
        )
    )
    @State private var errorText: String?
    @State private var query = ""

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    private var filtered: [APILocality] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return localities }
        return localities.filter { $0.name.lowercased().contains(q) }
    }

    private var openCount: Int { reports.filter { $0.status != "resolved" }.count }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(position: $camera) {
                    ForEach(localities) { loc in
                        Annotation(loc.name, coordinate: .init(latitude: loc.lat, longitude: loc.lng)) {
                            Button {
                                Task { await select(loc) }
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(selected?.id == loc.id ? HisabTheme.brand : Color.white)
                                    Circle()
                                        .stroke(HisabTheme.ink, lineWidth: 2)
                                }
                                .frame(width: 14, height: 14)
                            }
                        }
                    }
                }
                .mapStyle(.standard(elevation: .flat))
                .ignoresSafeArea(edges: .top)

                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(HisabTheme.mist)
                        TextField("Find locality", text: $query)
                            .textInputAutocapitalization(.never)
                    }
                    .padding(12)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    .padding(.horizontal)
                    .padding(.top, 8)

                    if !query.isEmpty {
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 0) {
                                ForEach(filtered.prefix(8)) { loc in
                                    Button {
                                        query = ""
                                        Task { await select(loc) }
                                    } label: {
                                        Text(loc.name)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 10)
                                    }
                                    .foregroundStyle(HisabTheme.ink)
                                }
                            }
                        }
                        .frame(maxHeight: 180)
                        .background(HisabTheme.paperElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .padding(.horizontal)
                    }

                    Spacer(minLength: 0)

                    if let selected {
                        sheet(for: selected)
                    }
                }
            }
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("Map")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(HisabTheme.paper, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink("Report") {
                        ReportComposerView()
                    }
                    .foregroundStyle(HisabTheme.brand)
                }
            }
            .task {
                await loadLocalities()
                if let snap = HereSnapshot.loadFromAppGroup() {
                    if let match = localities.first(where: { $0.id == snap.localityId }) {
                        await select(match)
                    }
                }
            }
        }
    }

    private func sheet(for loc: APILocality) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Capsule()
                .fill(HisabTheme.line)
                .frame(width: 36, height: 4)
                .frame(maxWidth: .infinity)

            Text("LOCALITY")
                .font(.caption2.weight(.semibold))
                .tracking(1.1)
                .foregroundStyle(HisabTheme.mist)
            Text(loc.name)
                .font(.title2.weight(.bold))
            Text("Ward \(loc.electoralWardId) · \(openCount) open")
                .font(.subheadline)
                .foregroundStyle(HisabTheme.mist)

            if let first = reports.first(where: { $0.status != "resolved" }) {
                NavigationLink {
                    IssueDetailView(
                        report: first,
                        localityName: loc.name,
                        wardId: loc.electoralWardId,
                        people: people.map {
                            .init(role: $0.role, shortTitle: $0.shortTitle, name: $0.name)
                        }
                    )
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        StatusPill(status: first.status)
                        Text(first.note)
                            .font(.subheadline)
                            .foregroundStyle(HisabTheme.ink)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                Text("No open issues here yet.")
                    .font(.subheadline)
                    .foregroundStyle(HisabTheme.mist)
            }

            NavigationLink {
                EscalationView(
                    localityName: loc.name,
                    people: [],
                    apiPeople: people
                )
            } label: {
                Text("Escalation route · \(people.count) contacts")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HisabTheme.ink)
            }

            if let errorText {
                Text(errorText).font(.caption).foregroundStyle(HisabTheme.brand)
            }
        }
        .padding(16)
        .background(HisabTheme.paper)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 16, y: -4)
    }

    private func loadLocalities() async {
        do {
            localities = try await client.listLocalities()
        } catch {
            errorText = error.localizedDescription
        }
    }

    private func select(_ loc: APILocality) async {
        selected = loc
        camera = .region(
            MKCoordinateRegion(
                center: .init(latitude: loc.lat, longitude: loc.lng),
                span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04)
            )
        )
        do {
            try await session.ensureSession(client: client)
            let (_, esc) = try await client.localityDetail(id: loc.id)
            people = esc
            reports = try await client.localityReports(
                localityId: loc.id,
                sessionToken: session.sessionToken
            )
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct LocalitiesBrowseView: View {
    @EnvironmentObject private var session: AppSession
    @State private var localities: [APILocality] = []
    @State private var query = ""
    @State private var openCounts: [String: Int] = [:]
    @State private var errorText: String?

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    private var filtered: [APILocality] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return localities }
        return localities.filter {
            $0.name.lowercased().contains(q) || String($0.electoralWardId).contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Search localities", text: $query)
                        .textInputAutocapitalization(.never)
                }
                .listRowBackground(HisabTheme.paper)

                Section {
                    ForEach(filtered) { loc in
                        NavigationLink {
                            LocalityLedgerView(locality: loc)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(loc.name)
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(HisabTheme.ink)
                                    Text("Ward \(loc.electoralWardId)")
                                        .font(.caption)
                                        .foregroundStyle(HisabTheme.mist)
                                }
                                Spacer()
                                if let n = openCounts[loc.id] {
                                    Text("\(n) open")
                                        .font(.caption.weight(.semibold).monospacedDigit())
                                        .foregroundStyle(HisabTheme.ink)
                                }
                            }
                        }
                        .listRowBackground(HisabTheme.paperElevated)
                    }
                }

                if let errorText {
                    Section {
                        Text(errorText).foregroundStyle(HisabTheme.brand)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("Localities")
            .toolbarBackground(HisabTheme.paper, for: .navigationBar)
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        do {
            localities = try await client.listLocalities()
            // Sample open counts for first screenful to avoid N+1 storm on every row
            for loc in localities.prefix(12) {
                let reports = try await client.localityReports(localityId: loc.id, sessionToken: nil)
                openCounts[loc.id] = reports.filter { $0.status != "resolved" }.count
            }
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct LocalityLedgerView: View {
    @EnvironmentObject private var session: AppSession
    let locality: APILocality

    @State private var reports: [APIReport] = []
    @State private var people: [APIEscalationPerson] = []
    @State private var tab: LedgerTab = .open
    @State private var errorText: String?

    private enum LedgerTab { case open, closed }

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    private var openReports: [APIReport] {
        reports.filter { $0.status != "resolved" }.sorted { $0.created_at > $1.created_at }
    }

    private var closedReports: [APIReport] {
        reports.filter { $0.status == "resolved" }.sorted { $0.created_at > $1.created_at }
    }

    private var visible: [APIReport] { tab == .open ? openReports : closedReports }

    var body: some View {
        List {
            Section {
                Text(locality.name)
                    .font(.largeTitle.weight(.bold))
                    .listRowBackground(HisabTheme.paper)
                Text("Ward \(locality.electoralWardId) · \(openReports.count) open · \(closedReports.count) closed")
                    .font(.subheadline)
                    .foregroundStyle(HisabTheme.mist)
                    .listRowBackground(HisabTheme.paper)
            }

            Section {
                Picker("Tab", selection: $tab) {
                    Text("Open \(openReports.count)").tag(LedgerTab.open)
                    Text("Closed \(closedReports.count)").tag(LedgerTab.closed)
                }
                .pickerStyle(.segmented)
                .listRowBackground(HisabTheme.paper)
            }

            Section {
                ForEach(visible) { report in
                    NavigationLink {
                        IssueDetailView(
                            report: report,
                            localityName: locality.name,
                            wardId: locality.electoralWardId,
                            people: people.map {
                                .init(role: $0.role, shortTitle: $0.shortTitle, name: $0.name)
                            }
                        )
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            StatusPill(status: report.status)
                            Text(report.note)
                                .foregroundStyle(HisabTheme.ink)
                                .lineLimit(2)
                        }
                    }
                    .listRowBackground(HisabTheme.paperElevated)
                }
            }

            Section {
                NavigationLink {
                    EscalationView(localityName: locality.name, people: [], apiPeople: people)
                } label: {
                    Text("Escalation route · \(people.count) contacts")
                        .fontWeight(.semibold)
                }
                .listRowBackground(HisabTheme.paper)
            }

            if let errorText {
                Section { Text(errorText).foregroundStyle(HisabTheme.brand) }
            }
        }
        .scrollContentBackground(.hidden)
        .background(HisabTheme.paper.ignoresSafeArea())
        .navigationTitle(locality.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        do {
            try await session.ensureSession(client: client)
            let (_, esc) = try await client.localityDetail(id: locality.id)
            people = esc
            reports = try await client.localityReports(
                localityId: locality.id,
                sessionToken: session.sessionToken
            )
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}
