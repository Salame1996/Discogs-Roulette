import Foundation
import AuthenticationServices
import CryptoKit
import UIKit

@MainActor
final class DiscogsOAuth: NSObject {
    static let shared = DiscogsOAuth()

    enum OAuthError: Error {
        case missingVerifier
        case invalidResponse
        case requestFailed(String)
        case userCancelled
    }

    private static let apiBaseURL = "https://api.discogs.com"
    private static let requestTokenURL = "https://api.discogs.com/oauth/request_token"
    private static let accessTokenURL = "https://api.discogs.com/oauth/access_token"
    private static let identityURL = "https://api.discogs.com/oauth/identity"
    private static let authorizeURL = "https://www.discogs.com/oauth/authorize"
    private static let callbackURL = "vinylroulette://oauth/callback"
    private static let callbackScheme = "vinylroulette"
    private static let userAgent = "VinylRoulette/1.0 +https://vinylroulette.app"

    private var authSession: ASWebAuthenticationSession?

    private override init() {
        super.init()
    }

    func initiateAuth(userId: String?) async throws -> String {
        let effectiveUserId = userId ?? Preferences.string(forKey: StorageKeys.currentUserId)
        if let uid = effectiveUserId {
            Preferences.setString(uid, forKey: StorageKeys.discogsOAuthUserId)
        }

        let requestTokens = try await fetchRequestToken()

        Preferences.setString(requestTokens.token, forKey: StorageKeys.discogsRequestToken)
        Preferences.setString(requestTokens.secret, forKey: StorageKeys.discogsRequestTokenSecret)

        guard var components = URLComponents(string: Self.authorizeURL) else {
            throw OAuthError.invalidResponse
        }
        components.queryItems = [URLQueryItem(name: "oauth_token", value: requestTokens.token)]
        guard let authURL = components.url else {
            throw OAuthError.invalidResponse
        }

        let callbackURLString = try await presentAuthSession(url: authURL)
        guard let callbackURL = URL(string: callbackURLString) else {
            throw OAuthError.invalidResponse
        }
        let resolvedUserId = userId ?? Preferences.string(forKey: StorageKeys.discogsOAuthUserId)
        _ = try await handleCallback(url: callbackURL, userId: resolvedUserId)
        return callbackURLString
    }

    @discardableResult
    func handleCallback(url: URL, userId: String?) async throws -> OAuthTokens {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let items = components.queryItems else {
            throw OAuthError.missingVerifier
        }

        var params: [String: String] = [:]
        for item in items {
            if let value = item.value {
                params[item.name] = value
            }
        }

        guard let verifier = params["oauth_verifier"],
              let returnedToken = params["oauth_token"] else {
            throw OAuthError.missingVerifier
        }

        guard let requestToken = Preferences.string(forKey: StorageKeys.discogsRequestToken),
              let requestTokenSecret = Preferences.string(forKey: StorageKeys.discogsRequestTokenSecret) else {
            throw OAuthError.requestFailed("Missing stored request token")
        }

        guard requestToken == returnedToken else {
            throw OAuthError.requestFailed("Request token mismatch")
        }

        Preferences.remove(forKey: StorageKeys.discogsRequestToken)
        Preferences.remove(forKey: StorageKeys.discogsRequestTokenSecret)

        let accessTokens = try await exchangeAccessToken(
            requestToken: requestToken,
            requestTokenSecret: requestTokenSecret,
            verifier: verifier
        )

        let username = try await fetchIdentityUsername(
            token: accessTokens.token,
            tokenSecret: accessTokens.secret
        )

        let resolvedUserId: String
        if let userId {
            resolvedUserId = userId
        } else if let stored = Preferences.string(forKey: StorageKeys.discogsOAuthUserId) {
            resolvedUserId = stored
        } else if let current = Preferences.string(forKey: StorageKeys.currentUserId) {
            resolvedUserId = current
        } else {
            throw OAuthError.requestFailed("No user logged in")
        }

        Preferences.remove(forKey: StorageKeys.discogsOAuthUserId)

        try SecureStorage.set(accessTokens.token, forKey: StorageKeys.discogsAccessToken(userId: resolvedUserId))
        try SecureStorage.set(accessTokens.secret, forKey: StorageKeys.discogsAccessTokenSecret(userId: resolvedUserId))
        Preferences.setString(username, forKey: StorageKeys.discogsUsername(userId: resolvedUserId))

        return OAuthTokens(token: accessTokens.token, tokenSecret: accessTokens.secret, username: username)
    }

    func getStoredTokens(userId: String?) -> OAuthTokens? {
        guard let resolvedUserId = userId ?? Preferences.string(forKey: StorageKeys.currentUserId) else {
            return nil
        }
        guard let token = SecureStorage.get(forKey: StorageKeys.discogsAccessToken(userId: resolvedUserId)),
              let secret = SecureStorage.get(forKey: StorageKeys.discogsAccessTokenSecret(userId: resolvedUserId)) else {
            return nil
        }
        let username = Preferences.string(forKey: StorageKeys.discogsUsername(userId: resolvedUserId))
        return OAuthTokens(token: token, tokenSecret: secret, username: username)
    }

    func clearStoredTokens(userId: String?) throws {
        guard let resolvedUserId = userId ?? Preferences.string(forKey: StorageKeys.currentUserId) else {
            return
        }
        try SecureStorage.remove(forKey: StorageKeys.discogsAccessToken(userId: resolvedUserId))
        try SecureStorage.remove(forKey: StorageKeys.discogsAccessTokenSecret(userId: resolvedUserId))
        Preferences.remove(forKey: StorageKeys.discogsUsername(userId: resolvedUserId))
    }

    func makeAuthenticatedRequest(
        method: String,
        endpoint: String,
        queryItems: [URLQueryItem] = [],
        userId: String? = nil
    ) async throws -> Data {
        guard let tokens = getStoredTokens(userId: userId) else {
            throw OAuthError.requestFailed("Not authenticated with Discogs")
        }

        guard var components = URLComponents(string: Self.apiBaseURL + endpoint) else {
            throw OAuthError.invalidResponse
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw OAuthError.invalidResponse
        }

        var params: [String: String] = [
            "oauth_consumer_key": Config.consumerKey,
            "oauth_token": tokens.token,
            "oauth_nonce": Self.generateNonce(),
            "oauth_signature_method": "PLAINTEXT",
            "oauth_timestamp": Self.timestamp()
        ]
        params["oauth_signature"] = Self.plaintextSignature(tokenSecret: tokens.tokenSecret)

        var request = URLRequest(url: url)
        request.httpMethod = method.uppercased()
        request.setValue(Self.oauthHeader(params: params), forHTTPHeaderField: "Authorization")
        request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw OAuthError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw OAuthError.requestFailed("HTTP \(http.statusCode)")
        }
        return data
    }

    private struct TokenPair {
        let token: String
        let secret: String
    }

    private func fetchRequestToken() async throws -> TokenPair {
        var params: [String: String] = [
            "oauth_consumer_key": Config.consumerKey,
            "oauth_nonce": Self.generateNonce(),
            "oauth_signature_method": "PLAINTEXT",
            "oauth_timestamp": Self.timestamp(),
            "oauth_callback": Self.callbackURL
        ]
        params["oauth_signature"] = Self.plaintextSignature(tokenSecret: nil)

        guard let url = URL(string: Self.requestTokenURL) else {
            throw OAuthError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(Self.oauthHeader(params: params), forHTTPHeaderField: "Authorization")
        request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw OAuthError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw OAuthError.requestFailed("request_token HTTP \(http.statusCode): \(body)")
        }

        let parsed = Self.parseFormEncoded(data: data)
        guard let token = parsed["oauth_token"], let secret = parsed["oauth_token_secret"] else {
            throw OAuthError.invalidResponse
        }
        return TokenPair(token: token, secret: secret)
    }

    private func exchangeAccessToken(
        requestToken: String,
        requestTokenSecret: String,
        verifier: String
    ) async throws -> TokenPair {
        var params: [String: String] = [
            "oauth_consumer_key": Config.consumerKey,
            "oauth_token": requestToken,
            "oauth_nonce": Self.generateNonce(),
            "oauth_signature_method": "PLAINTEXT",
            "oauth_timestamp": Self.timestamp(),
            "oauth_verifier": verifier
        ]
        params["oauth_signature"] = Self.plaintextSignature(tokenSecret: requestTokenSecret)

        guard let url = URL(string: Self.accessTokenURL) else {
            throw OAuthError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(Self.oauthHeader(params: params), forHTTPHeaderField: "Authorization")
        request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw OAuthError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw OAuthError.requestFailed("access_token HTTP \(http.statusCode): \(body)")
        }

        let parsed = Self.parseFormEncoded(data: data)
        guard let token = parsed["oauth_token"], let secret = parsed["oauth_token_secret"] else {
            throw OAuthError.invalidResponse
        }
        return TokenPair(token: token, secret: secret)
    }

    private func fetchIdentityUsername(token: String, tokenSecret: String) async throws -> String {
        var params: [String: String] = [
            "oauth_consumer_key": Config.consumerKey,
            "oauth_token": token,
            "oauth_nonce": Self.generateNonce(),
            "oauth_signature_method": "PLAINTEXT",
            "oauth_timestamp": Self.timestamp()
        ]
        params["oauth_signature"] = Self.plaintextSignature(tokenSecret: tokenSecret)

        guard let url = URL(string: Self.identityURL) else {
            throw OAuthError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(Self.oauthHeader(params: params), forHTTPHeaderField: "Authorization")
        request.setValue(Self.userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw OAuthError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw OAuthError.requestFailed("identity HTTP \(http.statusCode): \(body)")
        }

        struct Identity: Decodable { let username: String }
        let identity = try JSONDecoder().decode(Identity.self, from: data)
        return identity.username
    }

    private func presentAuthSession(url: URL) async throws -> String {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: Self.callbackScheme
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    continuation.resume(throwing: OAuthError.userCancelled)
                    return
                }
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: OAuthError.invalidResponse)
                    return
                }
                continuation.resume(returning: callbackURL.absoluteString)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.authSession = session
            if !session.start() {
                continuation.resume(throwing: OAuthError.requestFailed("Could not start auth session"))
            }
        }
    }

    private static func generateNonce() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        if status != errSecSuccess {
            let random = SymmetricKey(size: .bits128)
            return random.withUnsafeBytes { Data($0) }.map { String(format: "%02x", $0) }.joined()
        }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    private static func timestamp() -> String {
        String(Int(Date().timeIntervalSince1970))
    }

    private static func plaintextSignature(tokenSecret: String?) -> String {
        // OAuth 1.0a PLAINTEXT: signature is consumerSecret + "&" + tokenSecret, each percent-encoded.
        let encodedConsumer = percentEncode(Config.consumerSecret)
        let encodedToken = percentEncode(tokenSecret ?? "")
        return "\(encodedConsumer)&\(encodedToken)"
    }

    private static func oauthHeader(params: [String: String]) -> String {
        let pairs = params.keys.sorted().map { key -> String in
            let value = params[key] ?? ""
            return "\(percentEncode(key))=\"\(percentEncode(value))\""
        }
        return "OAuth " + pairs.joined(separator: ", ")
    }

    private static func percentEncode(_ value: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private static func parseFormEncoded(data: Data) -> [String: String] {
        guard let body = String(data: data, encoding: .utf8) else { return [:] }
        var result: [String: String] = [:]
        for pair in body.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            guard parts.count == 2 else { continue }
            let key = String(parts[0]).removingPercentEncoding ?? String(parts[0])
            let value = String(parts[1]).removingPercentEncoding ?? String(parts[1])
            result[key] = value
        }
        return result
    }
}

extension DiscogsOAuth: ASWebAuthenticationPresentationContextProviding {
    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes
            for scene in scenes {
                guard let windowScene = scene as? UIWindowScene else { continue }
                if let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) {
                    return keyWindow
                }
                if let first = windowScene.windows.first {
                    return first
                }
            }
            return ASPresentationAnchor()
        }
    }
}
