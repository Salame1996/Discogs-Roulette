import Foundation

enum Config {
    static let consumerKey: String =
        (Bundle.main.object(forInfoDictionaryKey: "DISCOGS_CONSUMER_KEY") as? String) ?? ""

    static let consumerSecret: String =
        (Bundle.main.object(forInfoDictionaryKey: "DISCOGS_CONSUMER_SECRET") as? String) ?? ""

    static let apiProxyBaseURL: URL = {
        let raw = (Bundle.main.object(forInfoDictionaryKey: "API_PROXY_BASE_URL") as? String) ?? ""
        return URL(string: raw) ?? URL(string: "https://example.invalid")!
    }()

    static var hasDiscogsCredentials: Bool {
        !consumerKey.isEmpty && !consumerSecret.isEmpty
    }
}
