import SwiftUI

struct LibraryView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var collection: CollectionStore
    @EnvironmentObject var links: ExternalLinkCoordinator

    @State private var query: String = ""

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 12, alignment: .top)]

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            content
        }
        .dismissKeyboardOnTap()
        .task { await collection.load(userId: auth.user?.id) }
    }

    private var items: [CollectionItem] { collection.items }
    private var isLoading: Bool { collection.isLoading }
    private var errorMessage: String? { collection.errorMessage }

    @ViewBuilder
    private var content: some View {
        if isLoading && items.isEmpty {
            ProgressView("Loading your collection…")
                .tint(Theme.tint)
                .foregroundStyle(Theme.textSecondary)
        } else if let errorMessage, items.isEmpty {
            VStack(spacing: 14) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.largeTitle)
                    .foregroundStyle(Theme.textSecondary)
                Text(errorMessage)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 32)
                Button("Retry") { Task { await collection.load(userId: auth.user?.id, force: true) } }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.tint)
                    .foregroundStyle(Theme.tintForeground)
            }
        } else if items.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "square.stack")
                    .font(.system(size: 48))
                    .foregroundStyle(Theme.textSecondary)
                Text("Your Discogs collection is empty")
                    .foregroundStyle(Theme.textSecondary)
            }
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    searchField
                    grid
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .refreshable { await collection.load(userId: auth.user?.id, force: true) }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Library")
                .font(.largeTitle.bold())
                .foregroundStyle(Theme.textPrimary)
            Text("\(items.count) releases")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
        }
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.textSecondary)
            TextField("Search titles or artists", text: $query)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .foregroundStyle(Theme.textPrimary)
            if !query.isEmpty {
                Button { query = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Theme.textSecondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.surfaceMuted)
        )
    }

    private var grid: some View {
        LazyVGrid(columns: columns, spacing: 18) {
            ForEach(filteredItems, id: \.instanceId) { item in
                albumCell(item)
            }
        }
    }

    private var filteredItems: [CollectionItem] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return items }
        return items.filter { item in
            let bi = item.basicInformation
            if bi.title.lowercased().contains(q) { return true }
            return bi.artists.contains { $0.name.lowercased().contains(q) }
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
