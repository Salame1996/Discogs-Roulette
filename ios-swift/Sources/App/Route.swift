import Foundation

enum Route: Hashable {
    case welcome
    case login
    case signup
    case noAccount
    case quiz
    case authOrchestrator(QuizAnswers)
    case recommendation(RecommendationContext)
    case moodAlbums(Mood)
}
