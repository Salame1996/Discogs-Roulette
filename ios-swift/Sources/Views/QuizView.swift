import SwiftUI

struct QuizView: View {
    @Environment(\.navigationPath) var path

    @State private var step: Int = 1
    @State private var moods: Set<Mood> = []
    @State private var tempos: Set<Tempo> = []
    @State private var genres: Set<Genre> = []
    @State private var decade: Decade?
    @State private var format: AlbumFormat?
    @State private var language: Language?

    private let totalSteps = 6

    var body: some View {
        VStack(spacing: 0) {
            progressStrip
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 16)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text(heading)
                        .font(.title.bold())
                        .foregroundStyle(Theme.textPrimary)
                    chips
                    if let n = selectedCountForStep {
                        Text("\(n) selected")
                            .font(.footnote)
                            .foregroundStyle(Theme.textSecondary)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            bottomActions
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(Theme.background.shadow(.drop(radius: 12, y: -6)))
        }
        .background(Theme.background.ignoresSafeArea())
    }

    private var progressStrip: some View {
        HStack(spacing: 6) {
            ForEach(1...totalSteps, id: \.self) { i in
                Capsule()
                    .fill(i <= step ? Theme.tint : Theme.surfaceMuted)
                    .frame(height: 6)
            }
        }
    }

    @ViewBuilder
    private var chips: some View {
        switch step {
        case 1:
            FlowLayout(spacing: 10) {
                ForEach(Mood.allCases) { m in
                    Chip(label: m.displayName, isSelected: moods.contains(m), color: Theme.moodCalm) {
                        toggle(&moods, m)
                    }
                }
            }
        case 2:
            FlowLayout(spacing: 10) {
                ForEach(Tempo.allCases) { t in
                    Chip(label: t.displayName, isSelected: tempos.contains(t), color: Theme.moodHype) {
                        toggle(&tempos, t)
                    }
                }
            }
        case 3:
            FlowLayout(spacing: 10) {
                ForEach(Genre.allCases) { g in
                    Chip(label: g.displayName, isSelected: genres.contains(g), color: Theme.accentViolet) {
                        toggle(&genres, g)
                    }
                }
            }
        case 4:
            FlowLayout(spacing: 10) {
                ForEach(Decade.allCases) { d in
                    Chip(label: d.displayName, isSelected: decade == d, color: Theme.tint) {
                        decade = d
                    }
                }
            }
        case 5:
            FlowLayout(spacing: 10) {
                ForEach(AlbumFormat.allCases) { f in
                    Chip(label: f.displayName, isSelected: format == f, color: Theme.tint) {
                        format = f
                    }
                }
            }
        case 6:
            FlowLayout(spacing: 10) {
                ForEach(Language.allCases) { l in
                    Chip(label: l.displayName, isSelected: language == l, color: Theme.tint) {
                        language = l
                    }
                }
            }
        default:
            EmptyView()
        }
    }

    private var bottomActions: some View {
        HStack(spacing: 12) {
            if step > 1 {
                Button { step -= 1 } label: {
                    Text("Back").font(.headline).frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .tint(Theme.textSecondary)
            }
            Button(action: handleNext) {
                Text(step == totalSteps ? "Finish" : "Next")
                    .font(.headline)
                    .foregroundStyle(Theme.tintForeground)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(Theme.tint)
            .disabled(!canProceed)
        }
    }

    private var heading: String {
        switch step {
        case 1: return "How are you feeling?"
        case 2: return "What pace?"
        case 3: return "Pick some genres"
        case 4: return "Which decade?"
        case 5: return "Albums or singles?"
        case 6: return "Language preference?"
        default: return ""
        }
    }

    private var selectedCountForStep: Int? {
        switch step {
        case 1: return moods.count
        case 2: return tempos.count
        case 3: return genres.count
        default: return nil
        }
    }

    private var canProceed: Bool {
        switch step {
        case 1: return !moods.isEmpty
        case 2: return !tempos.isEmpty
        case 3: return !genres.isEmpty
        case 4: return decade != nil
        case 5: return format != nil
        case 6: return language != nil
        default: return false
        }
    }

    private func toggle<T: Hashable>(_ set: inout Set<T>, _ value: T) {
        if set.contains(value) { set.remove(value) } else { set.insert(value) }
    }

    private func handleNext() {
        guard canProceed else { return }
        if step < totalSteps { step += 1 } else { submit() }
    }

    private func submit() {
        guard let decade, let format, let language,
              !moods.isEmpty, !tempos.isEmpty, !genres.isEmpty else { return }
        let answers = QuizAnswers(
            moods: moods.map(\.rawValue),
            tempos: tempos.map(\.rawValue),
            genres: genres.map(\.rawValue),
            decade: decade.rawValue,
            format: format.rawValue,
            language: language.rawValue
        )
        path.wrappedValue.append(Route.authOrchestrator(answers))
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0
        var rowMaxHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if rowWidth + size.width > maxWidth {
                totalHeight += rowMaxHeight + spacing
                rowWidth = size.width + spacing
                rowMaxHeight = size.height
            } else {
                rowWidth += size.width + spacing
                rowMaxHeight = max(rowMaxHeight, size.height)
            }
        }
        totalHeight += rowMaxHeight
        return CGSize(width: maxWidth, height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            sv.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
