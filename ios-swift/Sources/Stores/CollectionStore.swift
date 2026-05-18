import Foundation
import SwiftUI

@MainActor
final class CollectionStore: ObservableObject {
    @Published private(set) var items: [CollectionItem] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    private var lastFetchedUserId: String?

    func load(userId: String?, force: Bool = false) async {
        if isLoading { return }
        if !force, !items.isEmpty, lastFetchedUserId == userId { return }
        isLoading = true
        errorMessage = nil
        do {
            let fetched = try await CollectionFetcher.fetchUserCollection(userId: userId)
            self.items = fetched
            self.lastFetchedUserId = userId
        } catch {
            self.errorMessage = (error as NSError).localizedDescription
        }
        isLoading = false
    }

    func clear() {
        items = []
        lastFetchedUserId = nil
        errorMessage = nil
    }

    func itemsMatching(mood: Mood) -> [CollectionItem] {
        let keywords = mood.keywords.map { $0.lowercased() }
        return items.filter { item in
            let bi = item.basicInformation
            let haystack = (bi.genres + bi.styles + [bi.title])
                .joined(separator: " ")
                .lowercased()
            return keywords.contains { haystack.contains($0) }
        }
    }
}
