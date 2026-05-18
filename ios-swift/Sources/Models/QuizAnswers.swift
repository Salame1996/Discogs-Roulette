import Foundation

struct QuizAnswers: Codable, Equatable, Hashable {
    let moods: [String]
    let tempos: [String]
    let genres: [String]
    let decade: String
    let format: String
    let language: String
}
