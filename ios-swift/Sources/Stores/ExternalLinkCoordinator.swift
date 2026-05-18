import Foundation
import SwiftUI

struct PendingLink: Identifiable, Hashable {
    let id: UUID = UUID()
    let url: URL
}

struct PendingRequest: Hashable {
    let url: URL
    let collectionItem: CollectionItem?
    let release: ReleaseData?
}

@MainActor
final class ExternalLinkCoordinator: ObservableObject {
    @Published var pending: PendingRequest?
    @Published var presentingLink: PendingLink?
    @Published var presentingDetail: AlbumDetail?

    func request(url: URL, collectionItem: CollectionItem? = nil, release: ReleaseData? = nil) {
        self.pending = PendingRequest(url: url, collectionItem: collectionItem, release: release)
    }

    func dismiss() {
        self.pending = nil
    }

    func confirmOpenDiscogs() {
        guard let p = pending else { return }
        self.pending = nil
        self.presentingLink = PendingLink(url: p.url)
    }

    func viewInApp() {
        guard let p = pending, let item = p.collectionItem else { return }
        self.pending = nil
        self.presentingDetail = AlbumDetail(
            collectionItem: item,
            release: p.release,
            discogsURL: p.url
        )
    }

    func openWebFromDetail(_ url: URL) {
        self.presentingDetail = nil
        self.presentingLink = PendingLink(url: url)
    }
}
