import Foundation

enum DiscogsURL {
    static func release(for info: CollectionItem.BasicInformation) -> URL {
        let artistNames = info.artists.map(\.name).joined(separator: " ")
        return build(id: info.id, slugSource: "\(artistNames) \(info.title)")
    }

    static func release(for release: ReleaseData) -> URL {
        let artistNames = release.artists.map(\.name).joined(separator: " ")
        return build(id: release.id, slugSource: "\(artistNames) \(release.title)")
    }

    private static func build(id: Int, slugSource: String) -> URL {
        let slug = slugify(slugSource)
        let path = slug.isEmpty ? "\(id)" : "\(id)-\(slug)"
        return URL(string: "https://www.discogs.com/release/\(path)")
            ?? URL(string: "https://www.discogs.com/release/\(id)")!
    }

    private static func slugify(_ input: String) -> String {
        let lowercased = input.lowercased()
        let allowed = CharacterSet.lowercaseLetters.union(.decimalDigits)
        var out = ""
        var lastWasDash = false
        for scalar in lowercased.unicodeScalars {
            if allowed.contains(scalar) {
                out.unicodeScalars.append(scalar)
                lastWasDash = false
            } else if !lastWasDash, !out.isEmpty {
                out.append("-")
                lastWasDash = true
            }
        }
        while out.hasSuffix("-") { out.removeLast() }
        if out.count > 80 {
            out = String(out.prefix(80))
            while out.hasSuffix("-") { out.removeLast() }
        }
        return out
    }
}
