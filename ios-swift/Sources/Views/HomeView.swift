import SwiftUI

struct HomeView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var collection: CollectionStore
    @EnvironmentObject var links: ExternalLinkCoordinator
    @Environment(\.navigationPath) var path

    private let moodPalette: [(mood: Mood, label: String, color: Color)] = [
        (.happy, "Happy", Theme.moodHappy),
        (.relaxed, "Chill", Theme.moodChill),
        (.energetic, "Hype", Theme.moodHype),
        (.peaceful, "Calm", Theme.moodCalm),
        (.melancholic, "Sad", Theme.moodSad),
        (.aggressive, "Workout", Theme.moodWorkout)
    ]

    var body: some View {
        ZStack(alignment: .top) {
            Theme.background.ignoresSafeArea()
            HeroGradient()
                .frame(height: 380)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    header
                    searchField
                    heroCTACard
                    moodSection
                    recommendationsSection
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
            }
            .refreshable {
                await collection.load(userId: auth.user?.id, force: true)
            }
        }
        .task { await collection.load(userId: auth.user?.id) }
    }

    private var dailyVibe: DailyVibe { DailyVibe.current() }

    private var recommendedAlbums: [CollectionItem] {
        let keywords = dailyVibe.moods.flatMap(\.keywords).map { $0.lowercased() }
        guard !keywords.isEmpty else { return [] }
        let matches = collection.items.filter { item in
            let bi = item.basicInformation
            let haystack = (bi.genres + bi.styles + [bi.title]).joined(separator: " ").lowercased()
            return keywords.contains { haystack.contains($0) }
        }
        return Array(matches.shuffled().prefix(8))
    }

    @ViewBuilder
    private var recommendationsSection: some View {
        let albums = recommendedAlbums
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Recommendations")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Theme.textPrimary)
                Text(dailyVibe.prompt)
                    .font(.headline)
                    .foregroundStyle(Theme.tint)
                Text(dailyVibe.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
            if collection.isLoading && albums.isEmpty {
                HStack { ProgressView().tint(Theme.tint); Text("Loading your picks…").foregroundStyle(Theme.textSecondary).font(.footnote) }
                    .padding(.vertical, 8)
            } else if albums.isEmpty {
                Text("No matches in your collection for this vibe — come back later.")
                    .font(.footnote)
                    .foregroundStyle(Theme.textSecondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(albums, id: \.instanceId) { item in
                            recommendationCard(item)
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
    }

    @ViewBuilder
    private func recommendationCard(_ item: CollectionItem) -> some View {
        let bi = item.basicInformation
        Button {
            links.request(url: DiscogsURL.release(for: bi), collectionItem: item)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                AlbumCover(url: bi.coverImage, cornerRadius: 14)
                    .frame(width: 140, height: 140)
                Text(bi.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                    .frame(width: 140, alignment: .leading)
                Text(bi.artists.map(\.name).joined(separator: ", "))
                    .font(.caption2)
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
                    .frame(width: 140, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(greeting)
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
                Text(displayName)
                    .font(.title.bold())
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(1)
            }
            Spacer()
            Button {
                auth.signOut()
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .frame(width: 40, height: 40)
                    .background(
                        Circle().fill(Theme.surfaceElevated)
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Sign Out")
        }
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.textSecondary)
            Text("Search your collection")
                .foregroundStyle(Theme.textSecondary)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.surfaceMuted)
        )
    }

    private var heroCTACard: some View {
        Button {
            path.wrappedValue.append(Route.quiz)
        } label: {
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: Theme.cardCornerRadius, style: .continuous)
                    .fill(Theme.primaryGradient)

                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pick of the day")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.85))
                        Text("Take the quiz")
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                        Text("Get an album from your collection")
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    Spacer()
                    Image(systemName: "play.circle.fill")
                        .resizable()
                        .frame(width: 56, height: 56)
                        .foregroundStyle(.white)
                }
                .padding(20)
            }
            .frame(height: 140)
        }
        .buttonStyle(.plain)
    }

    private var moodSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Albums with moods")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(moodPalette, id: \.label) { entry in
                        Chip(label: entry.label, isSelected: true, color: entry.color) {
                            path.wrappedValue.append(Route.moodAlbums(entry.mood))
                        }
                    }
                }
                .padding(.horizontal, 2)
            }
        }
    }

    private var displayName: String {
        if let username = auth.discogsUsername, !username.isEmpty { return username }
        guard let email = auth.user?.email else { return "there" }
        let parts = email.split(separator: "@", maxSplits: 1).map(String.init)
        if parts.count == 2, parts[1] == "discogs.local" { return parts[0] }
        return parts[0]
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default: return "Welcome back"
        }
    }
}
