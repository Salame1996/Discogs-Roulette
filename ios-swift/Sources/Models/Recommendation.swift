import Foundation

struct Recommendation: Codable, Equatable, Hashable {
    let release: ReleaseData?
    let collectionItem: CollectionItem
    let score: Int
    let reasons: [String]
}

struct LabeledRecommendation: Codable, Equatable, Hashable, Identifiable {
    enum Strategy: String, Codable, Equatable, Hashable {
        case topMatch
        case moodVibe
        case decadeGem
        case deepCut
        case wildCard
        case freshPick
    }

    let id: UUID
    let strategy: Strategy
    let title: String
    let subtitle: String
    let recommendation: Recommendation
}

struct RecommendationContext: Hashable {
    let answers: QuizAnswers
    let releaseDataById: [Int: ReleaseData]
    let initialVariations: [LabeledRecommendation]
}
