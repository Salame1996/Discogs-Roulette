import Foundation

enum Mood: String, CaseIterable, Codable, Identifiable {
    case energetic
    case relaxed
    case melancholic
    case happy
    case aggressive
    case peaceful

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .energetic: return "Energetic"
        case .relaxed: return "Relaxed"
        case .melancholic: return "Melancholic"
        case .happy: return "Happy"
        case .aggressive: return "Aggressive"
        case .peaceful: return "Peaceful"
        }
    }

    var keywords: [String] {
        switch self {
        case .energetic: return ["energetic", "upbeat", "dance", "electronic", "rock", "punk"]
        case .relaxed: return ["ambient", "chill", "jazz", "lounge", "smooth", "soft"]
        case .melancholic: return ["sad", "melancholic", "depressive", "dark", "gothic", "doom"]
        case .happy: return ["happy", "upbeat", "pop", "cheerful", "bright"]
        case .aggressive: return ["aggressive", "metal", "hardcore", "punk", "thrash"]
        case .peaceful: return ["ambient", "meditation", "new age", "calm", "peaceful"]
        }
    }
}

enum Tempo: String, CaseIterable, Codable, Identifiable {
    case slow = "slow"
    case medium = "medium"
    case fast = "fast"
    case veryFast = "very-fast"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .slow: return "Slow"
        case .medium: return "Medium"
        case .fast: return "Fast"
        case .veryFast: return "Very Fast"
        }
    }

    var keywords: [String] {
        switch self {
        case .slow: return ["slow", "ballad", "ambient", "downtempo"]
        case .medium: return ["moderate", "mid-tempo"]
        case .fast: return ["fast", "upbeat", "dance", "techno"]
        case .veryFast: return ["very fast", "hardcore", "speed", "thrash"]
        }
    }
}

enum Genre: String, CaseIterable, Codable, Identifiable {
    case rock = "Rock"
    case jazz = "Jazz"
    case electronic = "Electronic"
    case hipHop = "Hip Hop"
    case classical = "Classical"
    case pop = "Pop"
    case metal = "Metal"
    case folk = "Folk"
    case blues = "Blues"
    case country = "Country"
    case reggae = "Reggae"
    case punk = "Punk"
    case rnb = "R&B"
    case soul = "Soul"
    case funk = "Funk"
    case disco = "Disco"
    case alternative = "Alternative"
    case indie = "Indie"

    var id: String { rawValue }
    var displayName: String { rawValue }
}

enum Decade: String, CaseIterable, Codable, Identifiable {
    case d1960s = "1960s"
    case d1970s = "1970s"
    case d1980s = "1980s"
    case d1990s = "1990s"
    case d2000s = "2000s"
    case d2010s = "2010s"
    case d2020s = "2020s"
    case any = "any"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .d1960s: return "1960s"
        case .d1970s: return "1970s"
        case .d1980s: return "1980s"
        case .d1990s: return "1990s"
        case .d2000s: return "2000s"
        case .d2010s: return "2010s"
        case .d2020s: return "2020s"
        case .any: return "Any Decade"
        }
    }

    var yearRange: ClosedRange<Int>? {
        switch self {
        case .d1960s: return 1960...1969
        case .d1970s: return 1970...1979
        case .d1980s: return 1980...1989
        case .d1990s: return 1990...1999
        case .d2000s: return 2000...2009
        case .d2010s: return 2010...2019
        case .d2020s: return 2020...2029
        case .any: return nil
        }
    }
}

enum AlbumFormat: String, CaseIterable, Codable, Identifiable {
    case album
    case single
    case both

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .album: return "Albums"
        case .single: return "Singles"
        case .both: return "Both"
        }
    }
}

enum Language: String, CaseIterable, Codable, Identifiable {
    case english
    case spanish
    case french
    case german
    case italian
    case portuguese
    case japanese
    case korean
    case chinese
    case all

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .english: return "English"
        case .spanish: return "Spanish"
        case .french: return "French"
        case .german: return "German"
        case .italian: return "Italian"
        case .portuguese: return "Portuguese"
        case .japanese: return "Japanese"
        case .korean: return "Korean"
        case .chinese: return "Chinese"
        case .all: return "All Languages"
        }
    }
}
