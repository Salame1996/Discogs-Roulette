import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var links: ExternalLinkCoordinator

    @State private var authPath = NavigationPath()

    var body: some View {
        Group {
            if auth.loading {
                ProgressView()
            } else if auth.user == nil {
                NavigationStack(path: $authPath) {
                    WelcomeView()
                        .navigationDestination(for: Route.self) { route in
                            switch route {
                            case .login: LoginView()
                            case .signup: SignupView()
                            case .noAccount: NoAccountView()
                            default: EmptyView()
                            }
                        }
                }
                .environment(\.navigationPath, $authPath)
            } else {
                MainTabView()
            }
        }
        .confirmationDialog(
            "Open this album",
            isPresented: Binding(
                get: { links.pending != nil },
                set: { if !$0 { links.dismiss() } }
            ),
            presenting: links.pending
        ) { p in
            if p.collectionItem != nil {
                Button("Get insight") { links.viewInApp() }
            }
            Button("Open Discogs") { links.confirmOpenDiscogs() }
            Button("Cancel", role: .cancel) { links.dismiss() }
        } message: { _ in
            Text("View details inside this app, or open the album page on Discogs.")
        }
        .sheet(item: $links.presentingLink) { link in
            SafariView(url: link.url)
                .ignoresSafeArea()
        }
        .sheet(item: $links.presentingDetail) { detail in
            AlbumDetailView(detail: detail)
        }
    }
}

struct MainTabView: View {
    @State private var homePath = NavigationPath()
    @State private var collectionPath = NavigationPath()
    @State private var quizPath = NavigationPath()

    var body: some View {
        TabView {
            NavigationStack(path: $homePath) {
                HomeView()
                    .navigationDestination(for: Route.self) { route in
                        destination(for: route)
                    }
            }
            .environment(\.navigationPath, $homePath)
            .tabItem { Label("Home", systemImage: "house.fill") }

            NavigationStack(path: $collectionPath) {
                LibraryView()
                    .navigationDestination(for: Route.self) { route in
                        destination(for: route)
                    }
            }
            .environment(\.navigationPath, $collectionPath)
            .tabItem { Label("Collection", systemImage: "square.stack.fill") }

            NavigationStack(path: $quizPath) {
                QuizView()
                    .navigationDestination(for: Route.self) { route in
                        destination(for: route)
                    }
            }
            .environment(\.navigationPath, $quizPath)
            .tabItem { Label("Quiz", systemImage: "questionmark.circle.fill") }
        }
        .tint(Theme.tint)
        .styledTabBar()
    }

    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case .welcome: WelcomeView()
        case .login: LoginView()
        case .signup: SignupView()
        case .noAccount: NoAccountView()
        case .quiz: QuizView()
        case .authOrchestrator(let answers): AuthOrchestratorView(answers: answers)
        case .recommendation(let context): RecommendationView(context: context)
        case .moodAlbums(let mood): MoodAlbumsView(mood: mood)
        }
    }
}
