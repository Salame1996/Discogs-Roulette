import Foundation

enum CollectionFetcherError: Error {
    case missingUsername
    case decodingFailed(Error)
}

@MainActor
enum CollectionFetcher {

    private struct Pagination: Decodable {
        let pages: Int
        let page: Int
        let perPage: Int
        let items: Int

        enum CodingKeys: String, CodingKey {
            case pages
            case page
            case perPage = "per_page"
            case items
        }
    }

    private struct CollectionPage: Decodable {
        let pagination: Pagination
        let releases: [CollectionItem]
    }

    private static func makeDecoder() -> JSONDecoder {
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        dec.keyDecodingStrategy = .useDefaultKeys
        return dec
    }

    private static func resolveUsername(userId: String?) -> String? {
        if let username = DiscogsOAuth.shared.getStoredTokens(userId: userId)?.username,
           !username.isEmpty {
            return username
        }
        if let userId {
            return Preferences.string(forKey: StorageKeys.discogsUsername(userId: userId))
        }
        return nil
    }

    static func fetchUserCollection(userId: String?) async throws -> [CollectionItem] {
        guard let username = resolveUsername(userId: userId) else {
            throw CollectionFetcherError.missingUsername
        }

        let decoder = makeDecoder()
        var allItems: [CollectionItem] = []
        var page = 1
        var totalPages = 1

        repeat {
            let data = try await DiscogsOAuth.shared.makeAuthenticatedRequest(
                method: "GET",
                endpoint: "/users/\(username)/collection/folders/0/releases",
                queryItems: [
                    URLQueryItem(name: "page", value: String(page)),
                    URLQueryItem(name: "per_page", value: "100"),
                ],
                userId: userId
            )

            let pageResponse: CollectionPage
            do {
                pageResponse = try decoder.decode(CollectionPage.self, from: data)
            } catch {
                throw CollectionFetcherError.decodingFailed(error)
            }

            allItems.append(contentsOf: pageResponse.releases)
            totalPages = pageResponse.pagination.pages
            page += 1
        } while page <= totalPages

        return allItems
    }

    static func fetchReleaseDetails(releaseId: Int, userId: String?) async throws -> ReleaseData {
        let data = try await DiscogsOAuth.shared.makeAuthenticatedRequest(
            method: "GET",
            endpoint: "/releases/\(releaseId)",
            queryItems: [],
            userId: userId
        )

        do {
            return try makeDecoder().decode(ReleaseData.self, from: data)
        } catch {
            throw CollectionFetcherError.decodingFailed(error)
        }
    }

    static func fetchMultipleReleaseDetails(
        releaseIds: [Int],
        userId: String?,
        onProgress: ((Int, Int) -> Void)?
    ) async throws -> [ReleaseData] {
        var results: [ReleaseData] = []
        let total = releaseIds.count

        for (index, releaseId) in releaseIds.enumerated() {
            if index > 0 {
                try await Task.sleep(for: .milliseconds(1100))
            }
            let release = try await fetchReleaseDetails(releaseId: releaseId, userId: userId)
            results.append(release)
            onProgress?(index + 1, total)
        }

        return results
    }
}
