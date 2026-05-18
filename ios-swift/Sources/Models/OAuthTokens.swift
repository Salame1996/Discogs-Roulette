import Foundation

struct OAuthTokens: Codable, Equatable {
    let token: String
    let tokenSecret: String
    let username: String?
}
