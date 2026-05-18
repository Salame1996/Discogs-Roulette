import SwiftUI

struct AuthOrchestratorView: View {
    let answers: QuizAnswers
    @EnvironmentObject var auth: AuthStore
    @Environment(\.navigationPath) var path

    @State private var stage: Stage = .checkingAuth
    @State private var progressLabel: String = ""
    @State private var detailsFetched: Int = 0
    @State private var detailsTotal: Int = 0
    @State private var errorMessage: String?

    enum Stage { case checkingAuth, awaitingOAuth, fetchingCollection, filtering, fetchingDetails, scoring, done, failed }

    var body: some View {
        VStack(spacing: 24) {
            switch stage {
            case .checkingAuth:    ProgressLabel("Checking Discogs sign-in…")
            case .awaitingOAuth:   ProgressLabel("Please complete Discogs sign-in")
            case .fetchingCollection: ProgressLabel("Loading your collection…")
            case .filtering:       ProgressLabel("Matching to your quiz…")
            case .fetchingDetails: ProgressLabel("Fetching release details \(detailsFetched)/\(detailsTotal)…")
            case .scoring:         ProgressLabel("Picking the best match…")
            case .done:            ProgressLabel("Done")
            case .failed:          VStack {
                Text(errorMessage ?? "Something went wrong").foregroundStyle(.red)
                Button("Try again") { run() }
            }
            }
        }
        .padding()
        .task { run() }
    }

    @ViewBuilder private func ProgressLabel(_ text: String) -> some View {
        VStack { ProgressView(); Text(text).font(.headline) }
    }

    private func run() {
        Task {
            do {
                errorMessage = nil

                let userId = auth.user?.id
                stage = .checkingAuth
                if DiscogsOAuth.shared.getStoredTokens(userId: userId) == nil {
                    stage = .awaitingOAuth
                    _ = try await DiscogsOAuth.shared.initiateAuth(userId: userId)
                    guard DiscogsOAuth.shared.getStoredTokens(userId: userId) != nil else {
                        throw NSError(domain: "Auth", code: 1, userInfo: [NSLocalizedDescriptionKey: "OAuth did not complete"])
                    }
                }

                stage = .fetchingCollection
                let collection = try await CollectionFetcher.fetchUserCollection(userId: userId)

                stage = .filtering
                var filtered = RecommendationEngine.filterCollection(collection, answers: answers)
                if filtered.isEmpty { filtered = RecommendationEngine.broadenFilters(collection, answers: answers) }
                guard !filtered.isEmpty else {
                    throw NSError(domain: "Recs", code: 2, userInfo: [NSLocalizedDescriptionKey: "No matches found in your collection."])
                }

                let topIds = Array(filtered.prefix(10)).map { $0.basicInformation.id }
                stage = .fetchingDetails
                detailsTotal = topIds.count
                let details = try await CollectionFetcher.fetchMultipleReleaseDetails(
                    releaseIds: topIds,
                    userId: userId,
                    onProgress: { done, _ in detailsFetched = done }
                )
                let map = Dictionary(uniqueKeysWithValues: details.map { ($0.id, $0) })

                stage = .scoring
                let variations = RecommendationEngine.recommendVariations(
                    collection: filtered,
                    answers: answers,
                    releaseDataById: map,
                    maxVariations: 6
                )
                guard !variations.isEmpty else {
                    throw NSError(domain: "Recs", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not generate recommendations."])
                }
                stage = .done
                let context = RecommendationContext(
                    answers: answers,
                    releaseDataById: map,
                    initialVariations: variations
                )
                path.wrappedValue.append(Route.recommendation(context))
            } catch {
                errorMessage = (error as NSError).localizedDescription
                stage = .failed
            }
        }
    }
}
