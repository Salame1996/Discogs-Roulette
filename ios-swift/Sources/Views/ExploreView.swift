import SwiftUI

struct ExploreView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Explore")
                    .font(.largeTitle)
                    .bold()
                    .foregroundStyle(Theme.textPrimary)

                Text("More content is coming soon. Check back later for curated recommendations, trending records, and ways to discover new music.")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.background.ignoresSafeArea())
    }
}
