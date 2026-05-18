import SwiftUI

struct WelcomeView: View {
    @Environment(\.navigationPath) var path

    @State private var spin: Double = 0
    @State private var pulse: Bool = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            HeroGradient()
                .frame(height: 560)
                .frame(maxHeight: .infinity, alignment: .top)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 28) {
                    Spacer().frame(height: 32)
                    heroSection
                    discogsRequirementCard
                    questionSection
                    Spacer().frame(height: 16)
                    footerCredit
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 14).repeatForever(autoreverses: false)) {
                spin = 360
            }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }

    private var heroSection: some View {
        VStack(spacing: 18) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 220)
                .rotationEffect(.degrees(spin))
                .shadow(color: Theme.tint.opacity(0.25), radius: 24, y: 12)

            VStack(spacing: 6) {
                Text("Crate Roulette")
                    .font(.system(size: 38, weight: .black))
                    .foregroundStyle(Theme.textPrimary)
                Text("Albums from your collection,\npicked by your mood.")
                    .font(.callout)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private var discogsRequirementCard: some View {
        VStack(spacing: 14) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Theme.moodWorkout)
                    .frame(width: 10, height: 10)
                    .opacity(pulse ? 1.0 : 0.3)
                    .scaleEffect(pulse ? 1.0 : 0.7)
                Text("DISCOGS ACCOUNT REQUIRED")
                    .font(.caption.weight(.heavy))
                    .tracking(1.2)
                    .foregroundStyle(Theme.moodWorkout)
            }

            VStack(spacing: 6) {
                Text("This app reads your records from Discogs.")
                    .font(.headline)
                    .foregroundStyle(Theme.textPrimary)
                    .multilineTextAlignment(.center)
                Text("No Discogs account, no collection — nothing to spin. Not affiliated with Discogs; just a fan-made companion.")
                    .font(.footnote)
                    .foregroundStyle(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Theme.surfaceElevated)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Theme.moodWorkout.opacity(pulse ? 0.55 : 0.18), lineWidth: 1.5)
        )
        .shadow(color: Theme.moodWorkout.opacity(pulse ? 0.18 : 0), radius: 18, y: 0)
    }

    private var questionSection: some View {
        VStack(spacing: 18) {
            Text("Do you have a\nDiscogs account?")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
                .multilineTextAlignment(.center)
                .lineSpacing(2)

            HStack(spacing: 14) {
                choiceButton(label: "Yes") {
                    path.wrappedValue.append(Route.login)
                }
                choiceButton(label: "No") {
                    path.wrappedValue.append(Route.noAccount)
                }
            }
        }
    }

    private func choiceButton(label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Theme.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 22)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Theme.surfaceElevated)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Theme.textSecondary.opacity(0.25), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private var footerCredit: some View {
        Text("Made by a fan · Not affiliated with Discogs")
            .font(.caption2)
            .foregroundStyle(Theme.textSecondary)
    }
}
