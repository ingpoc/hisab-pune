import SwiftUI

enum HisabTheme {
    /// Daylight paper ground
    static let paper = Color(red: 0.957, green: 0.965, blue: 0.957) // #F4F6F4
    static let paperElevated = Color.white
    /// Ink
    static let ink = Color(red: 0.055, green: 0.110, blue: 0.094) // #0E1C18
    static let mist = Color(red: 0.420, green: 0.478, blue: 0.455) // #6B7A74
    /// Brand / primary action only
    static let brand = Color(red: 0.776, green: 0.157, blue: 0.157) // #C62828
    static let signal = Color(red: 0.651, green: 0.486, blue: 0.0) // #A67C00
    static let ok = Color(red: 0.165, green: 0.490, blue: 0.353) // #2A7D5A
    static let line = Color(red: 0.055, green: 0.110, blue: 0.094).opacity(0.12)

    static func statusColor(_ status: String) -> Color {
        switch status {
        case "escalated": return signal
        case "resolved": return ok
        default: return brand
        }
    }
}

struct StatusPill: View {
    let status: String

    var body: some View {
        Text(status.uppercased())
            .font(.caption2.weight(.bold))
            .tracking(0.6)
            .foregroundStyle(HisabTheme.statusColor(status))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .stroke(HisabTheme.statusColor(status).opacity(0.7), lineWidth: 1)
            )
    }
}

struct IssueAgeLabel {
    static func text(createdAt: String, status: String) -> String {
        if status == "resolved" { return "Closed" }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: createdAt)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: createdAt)
        }
        guard let date else { return "Open" }
        let days = Calendar.current.dateComponents([.day], from: date, to: Date()).day ?? 0
        if days <= 0 { return "Opened today" }
        if days == 1 { return "1 day open" }
        return "\(days) days open"
    }
}
