import SwiftUI

private struct NavigationPathKey: EnvironmentKey {
    static let defaultValue: Binding<NavigationPath> = .constant(NavigationPath())
}

extension EnvironmentValues {
    var navigationPath: Binding<NavigationPath> {
        get { self[NavigationPathKey.self] }
        set { self[NavigationPathKey.self] = newValue }
    }
}

@main
struct VinylRouletteApp: App {
    @StateObject private var auth = AuthStore()
    @StateObject private var collection = CollectionStore()
    @StateObject private var links = ExternalLinkCoordinator()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(collection)
                .environmentObject(links)
                .onOpenURL { url in
                    Task { try? await DiscogsOAuth.shared.handleCallback(url: url, userId: nil) }
                }
        }
    }
}
