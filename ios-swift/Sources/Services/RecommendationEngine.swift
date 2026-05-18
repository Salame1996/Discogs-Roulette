import Foundation

@MainActor
enum RecommendationEngine {

    private static func matchesFormat(_ item: CollectionItem, format: String) -> Bool {
        if format == "both" { return true }

        let formats = item.basicInformation.formats.map { $0.name.lowercased() }
        let isSingle = formats.contains { $0.contains("single") || $0.contains("7\"") }
        let isAlbum = formats.contains { $0.contains("album") || $0.contains("lp") || $0.contains("12\"") }

        if format == "single" { return isSingle }
        if format == "album" { return isAlbum || !isSingle }
        return true
    }

    private static func matchesGenre(_ item: CollectionItem, genres: [String]) -> Bool {
        if genres.isEmpty { return true }
        let itemGenres = (item.basicInformation.genres + item.basicInformation.styles).map { $0.lowercased() }
        return genres.contains { genre in
            let lower = genre.lowercased()
            return itemGenres.contains { $0.contains(lower) }
        }
    }

    private static func matchesDecade(_ item: CollectionItem, range: ClosedRange<Int>?) -> Bool {
        guard let range else { return true }
        let year = item.basicInformation.year
        return range.contains(year)
    }

    private static func matchesMoodTempo(_ item: CollectionItem, moodKeywords: [String], tempoKeywords: [String]) -> Bool {
        let allKeywords = moodKeywords + tempoKeywords
        if allKeywords.isEmpty { return true }

        let parts = item.basicInformation.genres + item.basicInformation.styles + [item.basicInformation.title]
        let itemText = parts.joined(separator: " ").lowercased()

        return allKeywords.contains { itemText.contains($0.lowercased()) }
    }

    static func filterCollection(
        _ collection: [CollectionItem],
        answers: QuizAnswers
    ) -> [CollectionItem] {
        let moodKeywords = answers.moods.flatMap { Mood(rawValue: $0)?.keywords ?? [] }
        let tempoKeywords = answers.tempos.flatMap { Tempo(rawValue: $0)?.keywords ?? [] }
        let decadeRange = Decade(rawValue: answers.decade)?.yearRange

        return collection.filter { item in
            guard matchesFormat(item, format: answers.format) else { return false }

            let g = matchesGenre(item, genres: answers.genres)
            let d = matchesDecade(item, range: decadeRange)
            let mt = matchesMoodTempo(item, moodKeywords: moodKeywords, tempoKeywords: tempoKeywords)

            return g || d || mt
        }
    }

    static func broadenFilters(
        _ collection: [CollectionItem],
        answers: QuizAnswers
    ) -> [CollectionItem] {
        var current = QuizAnswers(
            moods: answers.moods,
            tempos: answers.tempos,
            genres: answers.genres,
            decade: answers.decade,
            format: "both",
            language: answers.language
        )
        var filtered = filterCollection(collection, answers: current)

        if filtered.isEmpty {
            current = QuizAnswers(
                moods: current.moods,
                tempos: current.tempos,
                genres: current.genres,
                decade: "any",
                format: current.format,
                language: current.language
            )
            filtered = filterCollection(collection, answers: current)
        }

        if filtered.isEmpty {
            current = QuizAnswers(
                moods: current.moods,
                tempos: current.tempos,
                genres: [],
                decade: current.decade,
                format: current.format,
                language: current.language
            )
            filtered = filterCollection(collection, answers: current)
        }

        return filtered
    }

    private static func calculateMatchScore(
        item: CollectionItem,
        answers: QuizAnswers,
        moodKeywords: [String],
        tempoKeywords: [String],
        decadeRange: ClosedRange<Int>?
    ) -> (score: Int, reasons: [String]) {
        var score = 0
        var reasons: [String] = []

        if matchesGenre(item, genres: answers.genres) {
            score += 30
            reasons.append("matches your preferred genres")
        }

        if matchesDecade(item, range: decadeRange) {
            score += 25
            if let decadeRange {
                reasons.append("from your preferred decade (\(decadeRange.lowerBound)s)")
            }
        }

        if matchesMoodTempo(item, moodKeywords: moodKeywords, tempoKeywords: tempoKeywords) {
            score += 25
            reasons.append("matches your mood and tempo preferences")
        }

        if matchesFormat(item, format: answers.format) {
            score += 10
            reasons.append("matches your format preference (\(answers.format))")
        }

        if item.rating > 0 {
            score += 10
            reasons.append("you have rated this release")
        }

        let daysSinceAdded = -item.dateAdded.timeIntervalSinceNow / 86400.0
        if daysSinceAdded < 30 {
            score += 10
            reasons.append("recently added to your collection")
        } else if daysSinceAdded < 90 {
            score += 5
        }

        return (score, reasons)
    }

    static func recommendAlbum(
        collection: [CollectionItem],
        answers: QuizAnswers,
        releaseDataById: [Int: ReleaseData]?
    ) -> Recommendation? {
        if collection.isEmpty { return nil }

        let moodKeywords = answers.moods.flatMap { Mood(rawValue: $0)?.keywords ?? [] }
        let tempoKeywords = answers.tempos.flatMap { Tempo(rawValue: $0)?.keywords ?? [] }
        let decadeRange = Decade(rawValue: answers.decade)?.yearRange

        struct Scored {
            let item: CollectionItem
            let score: Int
            let reasons: [String]
        }

        var scored: [Scored] = collection.map { item in
            let result = calculateMatchScore(
                item: item,
                answers: answers,
                moodKeywords: moodKeywords,
                tempoKeywords: tempoKeywords,
                decadeRange: decadeRange
            )
            return Scored(item: item, score: result.score, reasons: result.reasons)
        }

        scored.sort { a, b in
            if a.score != b.score { return a.score > b.score }
            if a.item.rating != b.item.rating { return a.item.rating > b.item.rating }
            return a.item.dateAdded > b.item.dateAdded
        }

        guard let top = scored.first, top.score > 0 else { return nil }

        let threshold = 5
        let closeMatches = scored.filter { top.score - $0.score <= threshold }
        let selected = closeMatches.count > 1 ? closeMatches.randomElement()! : top

        let release = releaseDataById?[selected.item.basicInformation.id]

        return Recommendation(
            release: release,
            collectionItem: selected.item,
            score: selected.score,
            reasons: selected.reasons
        )
    }

    private struct ScoredItem {
        let item: CollectionItem
        let score: Int
        let reasons: [String]
    }

    private static func scoreAll(
        _ collection: [CollectionItem],
        answers: QuizAnswers
    ) -> [ScoredItem] {
        let moodKeywords = answers.moods.flatMap { Mood(rawValue: $0)?.keywords ?? [] }
        let tempoKeywords = answers.tempos.flatMap { Tempo(rawValue: $0)?.keywords ?? [] }
        let decadeRange = Decade(rawValue: answers.decade)?.yearRange

        return collection.map { item in
            let result = calculateMatchScore(
                item: item,
                answers: answers,
                moodKeywords: moodKeywords,
                tempoKeywords: tempoKeywords,
                decadeRange: decadeRange
            )
            return ScoredItem(item: item, score: result.score, reasons: result.reasons)
        }
    }

    private static func moodTempoKeywordHits(_ item: CollectionItem, moodKeywords: [String], tempoKeywords: [String]) -> Int {
        let allKeywords = moodKeywords + tempoKeywords
        if allKeywords.isEmpty { return 0 }
        let parts = item.basicInformation.genres + item.basicInformation.styles + [item.basicInformation.title]
        let itemText = parts.joined(separator: " ").lowercased()
        return allKeywords.reduce(0) { $0 + (itemText.contains($1.lowercased()) ? 1 : 0) }
    }

    private static func genreOverlapCount(_ item: CollectionItem, genres: [String]) -> Int {
        if genres.isEmpty { return 0 }
        let itemGenres = (item.basicInformation.genres + item.basicInformation.styles).map { $0.lowercased() }
        return genres.reduce(0) { count, g in
            let lower = g.lowercased()
            return count + (itemGenres.contains { $0.contains(lower) } ? 1 : 0)
        }
    }

    private static func firstMatchedGenre(_ item: CollectionItem, genres: [String]) -> String? {
        let itemGenres = (item.basicInformation.genres + item.basicInformation.styles).map { $0.lowercased() }
        return genres.first { g in
            let lower = g.lowercased()
            return itemGenres.contains { $0.contains(lower) }
        }
    }

    private static func makeRecommendation(_ scored: ScoredItem, releaseDataById: [Int: ReleaseData]?) -> Recommendation {
        let release = releaseDataById?[scored.item.basicInformation.id]
        return Recommendation(
            release: release,
            collectionItem: scored.item,
            score: scored.score,
            reasons: scored.reasons
        )
    }

    static func recommendVariations(
        collection: [CollectionItem],
        answers: QuizAnswers,
        releaseDataById: [Int: ReleaseData]?,
        maxVariations: Int = 6
    ) -> [LabeledRecommendation] {
        if collection.isEmpty { return [] }

        var scored = scoreAll(collection, answers: answers)
        let hasPositive = scored.contains { $0.score > 0 }
        if !hasPositive {
            let broadened = broadenFilters(collection, answers: answers)
            scored = scoreAll(broadened, answers: answers)
        }

        if scored.isEmpty { return [] }

        let moodKeywords = answers.moods.flatMap { Mood(rawValue: $0)?.keywords ?? [] }
        let tempoKeywords = answers.tempos.flatMap { Tempo(rawValue: $0)?.keywords ?? [] }
        let decadeRange = Decade(rawValue: answers.decade)?.yearRange

        let byScore = scored.sorted { a, b in
            if a.score != b.score { return a.score > b.score }
            if a.item.rating != b.item.rating { return a.item.rating > b.item.rating }
            return a.item.dateAdded > b.item.dateAdded
        }

        var usedIds = Set<Int>()
        var output: [LabeledRecommendation] = []

        func take(_ scoredItem: ScoredItem, strategy: LabeledRecommendation.Strategy, title: String, subtitle: String) {
            usedIds.insert(scoredItem.item.basicInformation.id)
            output.append(LabeledRecommendation(
                id: UUID(),
                strategy: strategy,
                title: title,
                subtitle: subtitle,
                recommendation: makeRecommendation(scoredItem, releaseDataById: releaseDataById)
            ))
        }

        let topPool = byScore.filter { $0.score > 0 }.prefix(5)
        if let top = topPool.randomElement() {
            take(top, strategy: .topMatch, title: "Top Match", subtitle: "Best overall fit for your picks")
        }

        if output.count < maxVariations, !answers.moods.isEmpty || !answers.tempos.isEmpty {
            let pool = scored
                .filter { !usedIds.contains($0.item.basicInformation.id) }
                .map { (s: $0, hits: moodTempoKeywordHits($0.item, moodKeywords: moodKeywords, tempoKeywords: tempoKeywords)) }
                .filter { $0.hits > 0 || matchesMoodTempo($0.s.item, moodKeywords: moodKeywords, tempoKeywords: tempoKeywords) }
                .sorted { lhs, rhs in
                    if lhs.hits != rhs.hits { return lhs.hits > rhs.hits }
                    return lhs.s.score > rhs.s.score
                }
                .prefix(8)
                .map(\.s)
            if let candidate = pool.randomElement() {
                let moodLabel = (answers.moods.first?.capitalized ?? "Mood") + " Vibe"
                take(candidate, strategy: .moodVibe, title: moodLabel, subtitle: "Leans into your mood")
            }
        }

        if output.count < maxVariations, let range = decadeRange, answers.decade != "any" {
            let pool = byScore
                .filter { s in
                    !usedIds.contains(s.item.basicInformation.id) && range.contains(s.item.basicInformation.year)
                }
                .prefix(8)
            if let candidate = pool.randomElement() {
                let decadeTitle = "\(range.lowerBound)s Gem"
                take(candidate, strategy: .decadeGem, title: decadeTitle, subtitle: "From your favorite era")
            }
        }

        if output.count < maxVariations, !answers.genres.isEmpty {
            let pool = scored
                .filter { !usedIds.contains($0.item.basicInformation.id) }
                .map { (s: $0, overlap: genreOverlapCount($0.item, genres: answers.genres)) }
                .filter { $0.overlap > 0 }
                .sorted { lhs, rhs in
                    if lhs.overlap != rhs.overlap { return lhs.overlap > rhs.overlap }
                    return lhs.s.score > rhs.s.score
                }
                .prefix(8)
            if let pick = pool.randomElement() {
                let matched = firstMatchedGenre(pick.s.item, genres: answers.genres) ?? answers.genres.first ?? "Genre"
                let title = "\(matched.capitalized) Deep Cut"
                take(pick.s, strategy: .deepCut, title: title, subtitle: "Genre-first pick")
            }
        }

        if output.count < maxVariations {
            let pool = scored
                .filter { !usedIds.contains($0.item.basicInformation.id) && $0.score > 0 }
                .sorted { $0.item.dateAdded > $1.item.dateAdded }
                .prefix(15)
            if let candidate = pool.randomElement() {
                take(candidate, strategy: .freshPick, title: "Fresh Pick", subtitle: "Recently added to your collection")
            }
        }

        if output.count < maxVariations {
            let topPool = byScore.prefix(20).filter { !usedIds.contains($0.item.basicInformation.id) && $0.score > 0 }
            if let candidate = topPool.randomElement() {
                take(candidate, strategy: .wildCard, title: "Wild Card", subtitle: "Something a bit different")
            }
        }

        if output.count < 3 {
            for s in byScore {
                if output.count >= max(3, maxVariations) { break }
                if usedIds.contains(s.item.basicInformation.id) { continue }
                if s.score <= 0 { continue }
                take(s, strategy: .topMatch, title: "Top Match", subtitle: "Strong overall fit")
            }
        }

        return Array(output.prefix(maxVariations))
    }
}
