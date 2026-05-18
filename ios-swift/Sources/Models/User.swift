import Foundation

struct User: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let email: String
    let createdAt: Date
}
