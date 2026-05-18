import SwiftUI

struct RecommendationView: View {
    let context: RecommendationContext

    @EnvironmentObject var links: ExternalLinkCoordinator
    @EnvironmentObject var collection: CollectionStore
    @Environment(\.navigationPath) var path

    @State private var variations: [LabeledRecommendation] = []
    @State private var expanded: UUID? = nil
    @State private var isRerolling = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                header
                ForEach(variations) { v in
                    variationCard(v)
                        .onTapGesture { withAnimation(.snappy) { expanded = (expanded == v.id) ? nil : v.id } }
                }
                actionButtons
            }
            .padding(20)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Your Picks")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .onAppear {
            if variations.isEmpty { variations = context.initialVariations }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(variations.count) picks for you")
                .font(.title.bold())
                .foregroundStyle(Theme.textPrimary)
            Text("Each one combines your answers differently")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                reroll()
            } label: {
                HStack(spacing: 8) {
                    if isRerolling {
                        ProgressView().tint(Theme.textPrimary)
                    } else {
                        Image(systemName: "arrow.triangle.2.circlepath")
                    }
                    Text("Reroll albums")
                }
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Theme.surfaceElevated)
                )
            }
            .buttonStyle(.plain)
            .disabled(isRerolling)

            Button {
                path.wrappedValue = NavigationPath()
                path.wrappedValue.append(Route.quiz)
            } label: {
                Text("New Quiz")
                    .font(.headline)
                    .foregroundStyle(Theme.tintForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Theme.tint)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 12)
    }

    private func reroll() {
        isRerolling = true
        let answers = context.answers
        let releaseMap = context.releaseDataById
        let collectionItems = collection.items
        Task {
            let pool = RecommendationEngine.filterCollection(collectionItems, answers: answers).isEmpty
                ? RecommendationEngine.broadenFilters(collectionItems, answers: answers)
                : RecommendationEngine.filterCollection(collectionItems, answers: answers)
            let next = RecommendationEngine.recommendVariations(
                collection: pool.isEmpty ? collectionItems : pool,
                answers: answers,
                releaseDataById: releaseMap,
                maxVariations: 6
            )
            withAnimation(.snappy) {
                variations = next
                expanded = nil
            }
            isRerolling = false
        }
    }

    @ViewBuilder
    private func variationCard(_ v: LabeledRecommendation) -> some View {
        let rec = v.recommendation
        let bi = rec.collectionItem.basicInformation
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                AlbumCover(url: rec.release?.images.first?.uri ?? bi.coverImage)
                    .frame(width: 88, height: 88)
                VStack(alignment: .leading, spacing: 6) {
                    Text(v.title)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Theme.tintForeground)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Capsule().fill(strategyColor(v.strategy)))
                    Text(rec.release?.title ?? bi.title)
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                        .lineLimit(2)
                    Text(artistLine(rec))
                        .font(.subheadline)
                        .foregroundStyle(Theme.textSecondary)
                        .lineLimit(1)
                    Text("\(bi.year > 0 ? "\(bi.year) · " : "")\(v.subtitle)")
                        .font(.caption)
                        .foregroundStyle(Theme.textSecondary)
                }
                Spacer()
            }

            HStack {
                Image(systemName: "bolt.fill").foregroundStyle(Theme.tint)
                Text("Match \(rec.score)/100")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.textSecondary)
                Spacer()
                if v.id == expanded {
                    Image(systemName: "chevron.up").foregroundStyle(Theme.textSecondary)
                } else {
                    Image(systemName: "chevron.down").foregroundStyle(Theme.textSecondary)
                }
            }

            if v.id == expanded {
                Divider().overlay(Theme.textSecondary.opacity(0.15))
                if !rec.reasons.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(rec.reasons, id: \.self) { r in
                            HStack(alignment: .top, spacing: 6) {
                                Text("•").foregroundStyle(Theme.tint)
                                Text(r).font(.footnote).foregroundStyle(Theme.textSecondary)
                            }
                        }
                    }
                }
                if let tl = rec.release?.tracklist, !tl.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tracks").font(.footnote.weight(.semibold)).foregroundStyle(Theme.textPrimary)
                        ForEach(Array(tl.prefix(10).enumerated()), id: \.offset) { _, t in
                            HStack {
                                Text(t.position).font(.caption).foregroundStyle(Theme.textSecondary).frame(width: 28, alignment: .leading)
                                Text(t.title).font(.caption).foregroundStyle(Theme.textPrimary).lineLimit(1)
                                Spacer()
                                Text(t.duration).font(.caption).foregroundStyle(Theme.textSecondary)
                            }
                        }
                    }
                }
                Button {
                    let url = rec.release.map { DiscogsURL.release(for: $0) } ?? DiscogsURL.release(for: bi)
                    links.request(url: url, collectionItem: rec.collectionItem, release: rec.release)
                } label: {
                    Label("View on Discogs", systemImage: "arrow.up.right.square")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.tint)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardCornerRadius, style: .continuous)
                .fill(Theme.surfaceElevated)
        )
    }

    private func strategyColor(_ s: LabeledRecommendation.Strategy) -> Color {
        switch s {
        case .topMatch: return Theme.tint
        case .moodVibe: return Theme.moodCalm
        case .decadeGem: return Theme.accentViolet
        case .deepCut: return Theme.moodHype
        case .wildCard: return Theme.moodWorkout
        case .freshPick: return Theme.moodChill
        }
    }

    private func artistLine(_ r: Recommendation) -> String {
        if let names = r.release.map({ $0.artists.map(\.name).filter { !$0.isEmpty } }), !names.isEmpty {
            return names.joined(separator: ", ")
        }
        let bi = r.collectionItem.basicInformation
        let names = bi.artists.map(\.name).filter { !$0.isEmpty }
        return names.joined(separator: ", ")
    }
}
