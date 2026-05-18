import SwiftUI

struct AlbumDetailView: View {
    let detail: AlbumDetail

    @EnvironmentObject var links: ExternalLinkCoordinator
    @Environment(\.dismiss) private var dismissSheet

    private var bi: CollectionItem.BasicInformation { detail.collectionItem.basicInformation }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    cover
                    titleBlock
                    metadataSection
                    if let tl = detail.release?.tracklist, !tl.isEmpty {
                        tracklistSection(tl)
                    }
                    if let notes = detail.release?.notes, !notes.isEmpty {
                        notesSection(notes)
                    }
                    discogsButton
                        .padding(.top, 8)
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismissSheet() }
                        .foregroundStyle(Theme.tint)
                }
            }
            .navigationTitle("Insight")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var cover: some View {
        AlbumCover(url: detail.release?.images.first?.uri ?? bi.coverImage, cornerRadius: 16)
            .aspectRatio(1, contentMode: .fit)
            .frame(maxWidth: .infinity)
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(detail.release?.title ?? bi.title)
                .font(.title.bold())
                .foregroundStyle(Theme.textPrimary)
            Text(artistLine)
                .font(.title3)
                .foregroundStyle(Theme.textSecondary)
            if bi.year > 0 {
                Text("\(bi.year)")
                    .font(.subheadline)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
    }

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            if !bi.genres.isEmpty { tagRow(title: "Genres", values: bi.genres) }
            if !bi.styles.isEmpty { tagRow(title: "Styles", values: bi.styles) }
            if !bi.formats.isEmpty {
                tagRow(title: "Format", values: bi.formats.map { describeFormat($0) })
            }
            if let labels = bi.labels, !labels.isEmpty {
                tagRow(title: "Label", values: labels.compactMap(\.name))
            }
            if let country = detail.release?.country, !country.isEmpty {
                tagRow(title: "Country", values: [country])
            }
            if detail.collectionItem.rating > 0 {
                tagRow(title: "Your rating", values: [String(repeating: "★", count: detail.collectionItem.rating)])
            }
        }
    }

    private func tagRow(title: String, values: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.textSecondary)
                .textCase(.uppercase)
            FlowChips(values: values)
        }
    }

    private func describeFormat(_ f: CollectionItem.BasicInformation.Format) -> String {
        var parts: [String] = [f.name]
        if let desc = f.descriptions, !desc.isEmpty { parts.append(desc.joined(separator: ", ")) }
        if !f.qty.isEmpty, f.qty != "1" { parts.append("×\(f.qty)") }
        return parts.joined(separator: " · ")
    }

    private func tracklistSection(_ tracks: [ReleaseData.Track]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tracklist")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            VStack(spacing: 6) {
                ForEach(Array(tracks.enumerated()), id: \.offset) { _, t in
                    HStack {
                        Text(t.position).font(.caption).foregroundStyle(Theme.textSecondary).frame(width: 32, alignment: .leading)
                        Text(t.title).font(.subheadline).foregroundStyle(Theme.textPrimary).lineLimit(1)
                        Spacer()
                        Text(t.duration).font(.caption).foregroundStyle(Theme.textSecondary)
                    }
                    .padding(.vertical, 4)
                    Divider().overlay(Theme.textSecondary.opacity(0.1))
                }
            }
        }
    }

    private func notesSection(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Notes")
                .font(.headline)
                .foregroundStyle(Theme.textPrimary)
            Text(notes)
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
        }
    }

    private var discogsButton: some View {
        Button {
            links.openWebFromDetail(detail.discogsURL)
        } label: {
            Label("Open on Discogs", systemImage: "arrow.up.right.square")
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

    private var artistLine: String {
        if let r = detail.release {
            let names = r.artists.map(\.name).filter { !$0.isEmpty }
            if !names.isEmpty { return names.joined(separator: ", ") }
        }
        return bi.artists.map(\.name).filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

private struct FlowChips: View {
    let values: [String]
    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                Text(value)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.textPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Theme.surfaceMuted))
            }
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 6
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowH: CGFloat = 0
        for sv in subviews {
            let s = sv.sizeThatFits(.unspecified)
            if x + s.width > maxWidth {
                y += rowH + spacing
                x = s.width + spacing
                rowH = s.height
            } else {
                x += s.width + spacing
                rowH = max(rowH, s.height)
            }
        }
        return CGSize(width: maxWidth, height: y + rowH)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowH: CGFloat = 0
        for sv in subviews {
            let s = sv.sizeThatFits(.unspecified)
            if x + s.width > bounds.maxX {
                x = bounds.minX
                y += rowH + spacing
                rowH = 0
            }
            sv.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            rowH = max(rowH, s.height)
        }
    }
}
