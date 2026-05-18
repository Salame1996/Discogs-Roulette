import Foundation

enum StorageKeys {
    static let appUsers = "app_users"
    static let currentUserId = "current_user_id"

    static func userPassword(userId: String) -> String { "user_password_\(userId)" }
    static func discogsAccessToken(userId: String) -> String { "discogs_access_token_\(userId)" }
    static func discogsAccessTokenSecret(userId: String) -> String { "discogs_access_token_secret_\(userId)" }
    static func discogsUsername(userId: String) -> String { "discogs_username_\(userId)" }

    static let discogsRequestToken = "discogs_request_token"
    static let discogsRequestTokenSecret = "discogs_request_token_secret"
    static let discogsOAuthUserId = "discogs_oauth_user_id"
}
