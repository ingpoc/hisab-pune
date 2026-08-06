import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let snap = HereSnapshot.loadFromAppGroup() ?? .placeholder
        completion(SimpleEntry(date: Date(), snapshot: snap))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let snap = HereSnapshot.loadFromAppGroup() ?? .placeholder
        let entry = SimpleEntry(date: Date(), snapshot: snap)
        // System-budgeted refresh; main app writes App Group on significant location change.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let snapshot: HereSnapshot
}

extension HereSnapshot {
    static let placeholder = HereSnapshot(
        localityName: "Baner",
        wardId: 9,
        people: [
            .init(role: "ward_officer", shortTitle: "Ward office", name: "Aundh-Baner Regional Office"),
            .init(role: "corporator", shortTitle: "Corporator", name: "Rohini Sudhir Chimte"),
            .init(role: "mla", shortTitle: "MLA", name: "Chandrakant Patil"),
        ],
        resolvedAt: Date(),
        boundaryVersion: "2025-final-41"
    )
}

struct HisabPuneWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.snapshot.localityName.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(entry.snapshot.localityName)
                .font(.title2.weight(.bold))
            Text("Ward \(entry.snapshot.wardId)")
                .font(.caption)
                .foregroundStyle(.secondary)
            ForEach(entry.snapshot.people.prefix(3), id: \.name) { person in
                HStack {
                    Text(person.shortTitle)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .frame(width: 72, alignment: .leading)
                    Text(person.name)
                        .font(.caption.weight(.medium))
                        .lineLimit(1)
                }
            }
        }
        .padding()
    }
}

@main
struct HisabPuneWidget: Widget {
    let kind = "HisabPuneWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HisabPuneWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Hisab locality")
        .description("Shows who answers for your current Pune locality.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
