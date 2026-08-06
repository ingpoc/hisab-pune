import SwiftUI

@main
struct HisabPuneApp: App {
    @StateObject private var session = AppSession()
    @StateObject private var location = LocationModel()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(session)
                .environmentObject(location)
        }
    }
}
