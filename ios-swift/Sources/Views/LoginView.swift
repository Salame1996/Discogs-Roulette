import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthStore
    @Environment(\.navigationPath) var path

    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isSubmitting = false
    @State private var isDiscogsSubmitting = false
    @State private var showEmailFields = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            HeroGradient()
                .frame(height: 520)
                .frame(maxHeight: .infinity, alignment: .top)
                .ignoresSafeArea()
            ScrollView {
                VStack(spacing: 22) {
                    hero
                    disclaimerCard
                    primaryButton
                    emailToggle
                    if showEmailFields { emailForm }
                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }
                    footer
                    Spacer(minLength: 40)
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 32)
            }
            .dismissKeyboardOnTap()
        }
    }

    private var hero: some View {
        VStack(spacing: 12) {
            Image("AppLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 180)
                .shadow(color: Theme.tint.opacity(0.25), radius: 18, y: 8)
            Text("Crate Roulette")
                .font(.largeTitle.bold())
                .foregroundStyle(Theme.textPrimary)
            Text("Spin your Discogs collection.\nGet an album you forgot you owned.")
                .font(.subheadline)
                .foregroundStyle(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var disclaimerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .foregroundStyle(Theme.moodHype)
                Text("Heads up")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Theme.textPrimary)
            }
            Text("This is **not** an official Discogs app. It's a fan-made companion that **needs your Discogs account** to read your collection. No Discogs = no albums to spin.")
                .font(.footnote)
                .foregroundStyle(Theme.textSecondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.surfaceElevated)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Theme.moodHype.opacity(0.4), lineWidth: 1)
        )
    }

    private var primaryButton: some View {
        Button(action: signInWithDiscogs) {
            HStack(spacing: 10) {
                if isDiscogsSubmitting {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "record.circle.fill").font(.headline)
                }
                Text(isDiscogsSubmitting ? "Talking to Discogs…" : "Continue with Discogs")
                    .font(.headline)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Theme.primaryGradient)
            )
        }
        .buttonStyle(.plain)
        .disabled(isSubmitting || isDiscogsSubmitting)
    }

    private var emailToggle: some View {
        Button {
            withAnimation(.snappy) { showEmailFields.toggle() }
        } label: {
            HStack(spacing: 6) {
                Text(showEmailFields ? "Hide email sign-in" : "Or sign in with email")
                    .font(.footnote.weight(.semibold))
                Image(systemName: showEmailFields ? "chevron.up" : "chevron.down")
                    .font(.caption)
            }
            .foregroundStyle(Theme.textSecondary)
        }
        .buttonStyle(.plain)
    }

    private var emailForm: some View {
        VStack(spacing: 12) {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled(true)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Theme.surfaceMuted)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .foregroundStyle(Theme.textPrimary)

            SecureField("Password", text: $password)
                .textContentType(.password)
                .textInputAutocapitalization(.never)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Theme.surfaceMuted)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .foregroundStyle(Theme.textPrimary)

            HStack(spacing: 12) {
                Button(action: signIn) {
                    HStack {
                        if isSubmitting { ProgressView().tint(Theme.tintForeground) }
                        else { Text("Sign In") }
                    }
                    .font(.headline)
                    .foregroundStyle(Theme.tintForeground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Theme.tint)
                    )
                }
                .buttonStyle(.plain)
                .disabled(isSubmitting || isDiscogsSubmitting || email.isEmpty || password.isEmpty)

                Button {
                    path.wrappedValue.append(Route.signup)
                } label: {
                    Text("Sign Up")
                        .font(.headline)
                        .foregroundStyle(Theme.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Theme.surfaceElevated)
                        )
                }
                .buttonStyle(.plain)
                .disabled(isSubmitting || isDiscogsSubmitting)
            }
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private var footer: some View {
        VStack(spacing: 4) {
            Text("Made by a fan. Not affiliated with Discogs.")
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)
            Text("Your collection data stays on this device.")
                .font(.caption2)
                .foregroundStyle(Theme.textSecondary)
        }
        .multilineTextAlignment(.center)
        .padding(.top, 8)
    }

    private func signIn() {
        Task {
            error = nil
            isSubmitting = true
            defer { isSubmitting = false }
            do {
                try await auth.signIn(email: email, password: password)
            } catch {
                let message = (error as NSError).localizedDescription
                self.error = message.isEmpty ? "Sign in failed" : message
            }
        }
    }

    private func signInWithDiscogs() {
        Task {
            error = nil
            isDiscogsSubmitting = true
            defer { isDiscogsSubmitting = false }
            do {
                try await auth.signInWithDiscogs()
            } catch {
                let message = (error as NSError).localizedDescription
                self.error = message.isEmpty ? "Discogs sign-in failed" : "Discogs sign-in: \(message)"
            }
        }
    }
}
