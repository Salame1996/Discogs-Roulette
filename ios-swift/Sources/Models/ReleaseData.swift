import Foundation

struct ReleaseData: Codable, Equatable, Hashable {

    // MARK: - Properties

    let id: Int
    let title: String
    let year: Int
    let artists: [Artist]
    let genres: [String]
    let styles: [String]
    let formats: [Format]
    let labels: [Label]?
    let tracklist: [Track]
    let images: [Image]
    let notes: String?
    let country: String?

    // MARK: - Nested Types

    struct Artist: Codable, Equatable, Hashable {
        let id: Int
        let name: String
    }

    struct Format: Codable, Equatable, Hashable {
        let name: String
        let qty: String
        let descriptions: [String]?
    }

    struct Label: Codable, Equatable, Hashable {
        let id: Int?
        let name: String?
        let entityType: String?
        let catno: String?
        let resourceUrl: String?

        enum CodingKeys: String, CodingKey {
            case id
            case name
            case entityType = "entity_type"
            case catno
            case resourceUrl = "resource_url"
        }
    }

    struct Track: Codable, Equatable, Hashable {
        let position: String
        let title: String
        let duration: String
        let type_: String?

        enum CodingKeys: String, CodingKey {
            case position
            case title
            case duration
            case type_ = "type_"
        }
    }

    struct Image: Codable, Equatable, Hashable {
        let uri: String
        let type: String
        let resourceUrl: String?
        let uri150: String?
        let width: Int?
        let height: Int?

        enum CodingKeys: String, CodingKey {
            case uri
            case type
            case resourceUrl = "resource_url"
            case uri150
            case width
            case height
        }
    }
}
