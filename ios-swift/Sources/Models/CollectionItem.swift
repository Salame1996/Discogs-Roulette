import Foundation

struct CollectionItem: Codable, Equatable, Hashable {

    // MARK: - Properties

    let id: Int
    let instanceId: Int
    let rating: Int
    // requires .iso8601 dateDecodingStrategy on the JSONDecoder
    let dateAdded: Date
    let basicInformation: BasicInformation

    // MARK: - CodingKeys

    enum CodingKeys: String, CodingKey {
        case id
        case instanceId = "instance_id"
        case rating
        case dateAdded = "date_added"
        case basicInformation = "basic_information"
    }

    // MARK: - BasicInformation

    struct BasicInformation: Codable, Equatable, Hashable {
        let id: Int
        let title: String
        let year: Int
        let artists: [Artist]
        let genres: [String]
        let styles: [String]
        let formats: [Format]
        let labels: [Label]?
        let thumb: String
        let coverImage: String
        let masterId: Int?
        let masterUrl: String?
        let resourceUrl: String?

        enum CodingKeys: String, CodingKey {
            case id
            case title
            case year
            case artists
            case genres
            case styles
            case formats
            case labels
            case thumb
            case coverImage = "cover_image"
            case masterId = "master_id"
            case masterUrl = "master_url"
            case resourceUrl = "resource_url"
        }

        struct Artist: Codable, Equatable, Hashable {
            let id: Int
            let name: String
            let anv: String?
            let join: String?
            let role: String?
            let resourceUrl: String?
            let tracks: String?

            enum CodingKeys: String, CodingKey {
                case id
                case name
                case anv
                case join
                case role
                case resourceUrl = "resource_url"
                case tracks
            }
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
    }
}
