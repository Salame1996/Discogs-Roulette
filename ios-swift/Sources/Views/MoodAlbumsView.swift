import SwiftUI

struct MoodAlbumsView: View {
    let mood: Mood

    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var collection: CollectionStore
    @EnvironmentObject var links: ExternalLinkCoordinator
    @Environment(\.navigationPath) var path

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 12, alignment: .top)]

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            content
        }
        .navigationTitle("\(mood.displayName) Picks")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task { await collection.load(userId: auth.user?.id) }
    }

    @ViewBuilder
    private var content: some View {
        if collection.isLoading && collection.items.isEmpty {
            ProgressView("Loading your collection…")
                .tint(Theme.tint)
                .foregroundStyle(Theme.textSecondary)
        } else if let errorMessage = collection.errorMessage, collection.items.isEmpty {
            VStack(spacing: 14) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.largeTitle)
                    .foregroundStyle(Theme.textSecondary)
                Text(errorMessage)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 32)
                Button("Retry") {
                    Task { await collection.load(userId: auth.user?.id, force: true) }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.tint)
                .foregroundStyle(Theme.tintForeground)
            }
        } else {
            let matches = collection.itemsMatching(mood: mood)
            if matches.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 48))
                        .foregroundStyle(Theme.textSecondary)
                    Text("No \(mood.displayName.lowercased()) matches in your collection")
                        .foregroundStyle(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header(count: matches.count)
                        LazyVGrid(columns: columns, spacing: 18) {
                            ForEach(matches, id: \.instanceId) { item in
                                albumCell(item)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 24)
                }
                .refreshable {
                    await collection.load(userId: auth.user?.id, force: true)
                }
            }
        }
    }

    private func header(count: Int) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Circle().fill(color).frame(width: 12, height: 12)
                Text(mood.displayName)
                    .font(.largeTitle.bold())
                    .foregroundStyle(Theme.textPrimary)
            }
            Text("\(count) \(count == 1 ? "album" : "albums") that match")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
        }
    }

    private var color: Color {
        switch mood {
        case .happy: return Theme.moodHappy
        case .relaxed: return Theme.moodChill
        case .energetic: return Theme.moodHype
        case .peaceful: return Theme.moodCalm
        case .melancholic: return Theme.moodSad
        case .aggressive: return Theme.moodWorkout
        }
    }

    @ViewBuilder
    private func albumCell(_ item: CollectionItem) -> some View {
        let bi = item.basicInformation
        Button {
            links.request(url: DiscogsURL.release(for: bi), collectionItem: item)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                AlbumCover(url: bi.coverImage, cornerRadius: 12)
                    .aspectRatio(1, contentMode: .fit)
                Text(bi.title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .lineLimit(2)
                Text(bi.artists.map(\.name).joined(separator: ", "))
                    .font(.caption2)
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
    }
}
