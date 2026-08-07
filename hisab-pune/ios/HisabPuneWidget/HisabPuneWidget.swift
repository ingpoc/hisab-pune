import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), snapshot: .placeholder, openCount: 6)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let snap = HereSnapshot.loadFromAppGroup() ?? .placeholder
        completion(SimpleEntry(date: Date(), snapshot: snap, openCount: nil))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let snap = HereSnapshot.loadFromAppGroup() ?? .placeholder
        let entry = SimpleEntry(date: Date(), snapshot: snap, openCount: nil)
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let snapshot: HereSnapshot
    let openCount: Int?
}

extension HereSnapshot {
    static let placeholder = HereSnapshot(
        localityName: "Baner",
        localityId: "baner",
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

private enum WidgetPalette {
    static let paper = Color(red: 0.957, green: 0.965, blue: 0.957)
    static let ink = Color(red: 0.055, green: 0.110, blue: 0.094)
    static let mist = Color(red: 0.420, green: 0.478, blue: 0.455)
    static let brand = Color(red: 0.776, green: 0.157, blue: 0.157)
}

struct HisabPuneWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: Provider.Entry

    var body: some View {
        Group {
            if family == .systemSmall {
                smallBody
            } else {
                mediumBody
            }
        }
        .containerBackground(for: .widget) {
            WidgetPalette.paper
        }
    }

    private var smallBody: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Circle()
                    .fill(WidgetPalette.brand)
                    .frame(width: 7, height: 7)
                Text(entry.snapshot.localityName.uppercased())
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(WidgetPalette.mist)
                    .lineLimit(1)
            }
            Text(entry.snapshot.localityName)
                .font(.title2.weight(.bold))
                .foregroundStyle(WidgetPalette.ink)
                .minimumScaleFactor(0.8)
            Text("Ward \(entry.snapshot.wardId)")
                .font(.caption)
                .foregroundStyle(WidgetPalette.mist)
            if let openCount = entry.openCount {
                Text("\(openCount) open")
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(WidgetPalette.ink)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    private var mediumBody: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(WidgetPalette.brand)
                        .frame(width: 7, height: 7)
                    Text("HISAB")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(WidgetPalette.mist)
                }
                Text(entry.snapshot.localityName)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(WidgetPalette.ink)
                Text("Ward \(entry.snapshot.wardId)")
                    .font(.caption)
                    .foregroundStyle(WidgetPalette.mist)
                if let openCount = entry.openCount {
                    Text("\(openCount) open")
                        .font(.caption.weight(.semibold).monospacedDigit())
                        .foregroundStyle(WidgetPalette.ink)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(entry.snapshot.people.prefix(3), id: \.name) { person in
                    VStack(alignment: .leading, spacing: 1) {
                        Text(person.shortTitle)
                            .font(.caption2)
                            .foregroundStyle(WidgetPalette.mist)
                        Text(person.name)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(WidgetPalette.ink)
                            .lineLimit(1)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

@main
struct HisabPuneWidget: Widget {
    let kind = "HisabPuneWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HisabPuneWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Hisab locality")
        .description("Shows who answers for your current Pune locality.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
