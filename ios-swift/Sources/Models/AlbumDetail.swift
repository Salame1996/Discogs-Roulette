import Foundation

struct AlbumDetail: Identifiable, Hashable {
    let id: UUID = UUID()
    let collectionItem: CollectionItem
    let release: ReleaseData?
    let discogsURL: URL
}
