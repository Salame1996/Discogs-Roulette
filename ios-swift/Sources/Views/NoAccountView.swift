import SwiftUI

struct NoAccountView: View {
    @Environment(\.navigationPath) var path
    @Environment(\.openURL) var openURL

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 22) {
                    Spacer().frame(height: 40)

                    VStack(spacing: 12) {
                        Text("😢")
                            .font(.system(size: 72))
                        Text("Sadly, you can't use this app")
                            .font(.title.bold())
                            .foregroundStyle(Theme.textPrimary)
                            .multilineTextAlignment(.center)
                        Text("Crate Roulette spins albums from **your Discogs collection**. Without a Discogs account, there's no collection to spin.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.textSecondary)
                            .multilineTextAlignment(.center)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        explainerRow(
                            icon: "person.crop.circle.badge.plus",
                            title: "What's Discogs?",
                            text: "Discogs is the world's biggest music database. Music fans use it to catalog the physical records, CDs, and tapes they own."
                        )
                        explainerRow(
                            icon: "checkmark.seal.fill",
                            title: "It's free",
                            text: "Creating a Discogs account costs nothing. Once you have one, add a few albums from your shelf and come back here to spin them."
                        )
                        explainerRow(
                            icon: "arrow.uturn.backward.circle.fill",
                            title: "Already made one?",
                            text: "Tap **Go back** below and choose \"Yes\" on the welcome screen to link it."
                        )
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Theme.surfaceElevated)
                    )

                    Button {
                        if let url = URL(string: "https://www.discogs.com/users/create") {
                            openURL(url)
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.up.right.square")
                            Text("Create a Discogs account")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Theme.primaryGradient)
                        )
                    }
                    .buttonStyle(.plain)

                    Button {
                        if !path.wrappedValue.isEmpty {
                            path.wrappedValue.removeLast()
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "chevron.left")
                            Text("Go back")
                        }
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Theme.surfaceMuted)
                        )
                    }
                    .buttonStyle(.plain)

                    Spacer().frame(height: 24)
                }
                .padding(.horizontal, 24)
            }
        }
        .navigationBarBackButtonHidden(false)
    }

    private func explainerRow(icon: String, title: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(Theme.tint)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.textPrimary)
                Text(.init(text))
                    .font(.footnote)
                    .foregroundStyle(Theme.textSecondary)
            }
        }
    }
}
