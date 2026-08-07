import SwiftUI

struct IssueDetailView: View {
    @EnvironmentObject private var session: AppSession
    let report: APIReport
    let localityName: String
    let wardId: Int
    let people: [HereSnapshot.Person]

    @State private var showEscalation = false
    @State private var showCare = false

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    StatusPill(status: report.status)
                    Text(
                        IssueCategory(rawValue: report.category_id ?? "")?.label
                            ?? "Civic issue"
                    )
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HisabTheme.mist)
                    Text(report.note)
                        .font(.body)
                        .foregroundStyle(HisabTheme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(localityName) · Ward \(wardId)")
                        .font(.subheadline)
                        .foregroundStyle(HisabTheme.mist)
                    HStack(spacing: 8) {
                        Text(report.author_label ?? "Resident")
                        Text("·")
                        Text(IssueAgeLabel.text(createdAt: report.created_at, status: report.status))
                    }
                    .font(.caption)
                    .foregroundStyle(HisabTheme.mist)
                }
                .padding(.vertical, 4)
                .listRowBackground(HisabTheme.paper)
            }

            if report.status != "resolved" {
                Section {
                    Button("Escalate") {
                        showEscalation = true
                    }
                    .buttonStyle(HisabPrimaryButtonStyle())
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    .listRowBackground(HisabTheme.paper)
                }
            }

            Section {
                NavigationLink {
                    EscalationView(
                        localityName: localityName,
                        people: people,
                        seedNote: report.note
                    )
                } label: {
                    rowLabel("Escalation route", trailing: "\(people.count) contacts")
                }
                .listRowBackground(HisabTheme.paperElevated)

                Button {
                    showCare = true
                } label: {
                    rowLabel("PMC CARE", trailing: "On demand")
                }
                .listRowBackground(HisabTheme.paperElevated)
            }
        }
        .scrollContentBackground(.hidden)
        .background(HisabTheme.paper.ignoresSafeArea())
        .navigationTitle("Issue")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(HisabTheme.paper, for: .navigationBar)
        .sheet(isPresented: $showCare) {
            CareSheetView(reportId: report.id)
                .environmentObject(session)
        }
        .sheet(isPresented: $showEscalation) {
            NavigationStack {
                EscalationView(
                    localityName: localityName,
                    people: people,
                    seedNote: report.note
                )
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { showEscalation = false }
                    }
                }
            }
        }
    }

    private func rowLabel(_ title: String, trailing: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(HisabTheme.ink)
                .fontWeight(.semibold)
            Spacer()
            Text(trailing)
                .font(.subheadline)
                .foregroundStyle(HisabTheme.mist)
        }
    }
}

struct EscalationView: View {
    let localityName: String
    let people: [HereSnapshot.Person]
    var seedNote: String? = nil
    var apiPeople: [APIEscalationPerson] = []

    private var rows: [(title: String, name: String, phone: String?, handle: String?)] {
        if !apiPeople.isEmpty {
            return apiPeople.map {
                ($0.shortTitle, $0.name, $0.phone, $0.xHandle.map { "@\($0)" })
            }
        }
        return people.map { ($0.shortTitle, $0.name, nil, nil) }
    }

    var body: some View {
        List {
            Section {
                Text("Escalation · \(localityName)")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(HisabTheme.ink)
                    .listRowBackground(HisabTheme.paper)
                Text("\(rows.count) contacts · pressure tools stay on demand")
                    .font(.footnote)
                    .foregroundStyle(HisabTheme.mist)
                    .listRowBackground(HisabTheme.paper)
            }

            Section {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(row.title)
                            .font(.caption)
                            .foregroundStyle(HisabTheme.mist)
                        Text(row.name)
                            .font(.body.weight(.medium))
                            .foregroundStyle(HisabTheme.ink)
                        HStack(spacing: 12) {
                            if let phone = row.phone, let url = URL(string: "tel:\(phone)") {
                                Link("Call", destination: url)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(HisabTheme.brand)
                            }
                            if let handle = row.handle {
                                Text(handle)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(HisabTheme.mist)
                            }
                        }
                    }
                    .padding(.vertical, 2)
                    .listRowBackground(HisabTheme.paperElevated)
                }
            }

            if let seedNote, !seedNote.isEmpty {
                Section("Draft context") {
                    Text(seedNote)
                        .font(.footnote)
                        .foregroundStyle(HisabTheme.mist)
                        .listRowBackground(HisabTheme.paper)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(HisabTheme.paper.ignoresSafeArea())
        .navigationTitle("Escalation")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(HisabTheme.paper, for: .navigationBar)
    }
}

struct CareSheetView: View {
    @EnvironmentObject private var session: AppSession
    @Environment(\.dismiss) private var dismiss
    let reportId: String

    @State private var links: APICareLinks?
    @State private var ticket = ""
    @State private var message: String?
    @State private var loading = false

    private var client: HisabAPIClient { HisabAPIClient(baseURL: session.baseURL) }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("PMC CARE")
                        .font(.title3.weight(.bold))
                    Text("No partner write API — open CARE yourself, then paste the ticket number here.")
                        .font(.footnote)
                        .foregroundStyle(HisabTheme.mist)
                }
                .listRowBackground(HisabTheme.paper)

                Section {
                    Button(loading ? "Loading…" : "Open CARE links") {
                        Task { await loadLinks() }
                    }
                    .foregroundStyle(HisabTheme.brand)
                    .disabled(loading)

                    if let links {
                        Link("Open CARE portal", destination: URL(string: links.portal)!)
                        Link("WhatsApp draft", destination: URL(string: links.whatsapp)!)
                    }
                }
                .listRowBackground(HisabTheme.paperElevated)

                Section("Ticket number") {
                    TextField("Paste CARE ticket #", text: $ticket)
                    Button("Save ticket") {
                        Task { await saveTicket() }
                    }
                    .disabled(ticket.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .foregroundStyle(HisabTheme.brand)
                }
                .listRowBackground(HisabTheme.paperElevated)

                if let message {
                    Section {
                        Text(message)
                            .font(.footnote)
                            .foregroundStyle(HisabTheme.mist)
                    }
                    .listRowBackground(HisabTheme.paper)
                }
            }
            .scrollContentBackground(.hidden)
            .background(HisabTheme.paper.ignoresSafeArea())
            .navigationTitle("CARE")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func loadLinks() async {
        loading = true
        defer { loading = false }
        do {
            links = try await client.careLinks(reportId: reportId)
            message = "CARE is fail-closed — file on the portal, then save your ticket."
        } catch {
            message = error.localizedDescription
        }
    }

    private func saveTicket() async {
        do {
            try await session.ensureSession(client: client)
            guard let token = session.sessionToken else { return }
            try await client.attachGovTicket(
                reportId: reportId,
                externalId: ticket.trimmingCharacters(in: .whitespacesAndNewlines),
                sessionToken: token
            )
            message = "Saved CARE ticket \(ticket.trimmingCharacters(in: .whitespacesAndNewlines))"
            ticket = ""
        } catch {
            message = error.localizedDescription
        }
    }
}
