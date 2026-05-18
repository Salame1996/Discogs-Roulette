import SwiftUI

struct SignupView: View {
    @EnvironmentObject var auth: AuthStore
    @Environment(\.navigationPath) var path

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var error: String?
    @State private var isSubmitting = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Create Account").font(.largeTitle).bold()

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled(true)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $password)
                    .textContentType(.newPassword)
                    .textInputAutocapitalization(.never)
                    .textFieldStyle(.roundedBorder)

                SecureField("Confirm Password", text: $confirmPassword)
                    .textContentType(.newPassword)
                    .textInputAutocapitalization(.never)
                    .textFieldStyle(.roundedBorder)

                if let error {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }

                Button(action: signUp) {
                    if isSubmitting {
                        ProgressView()
                    } else {
                        Text("Sign Up")
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .tint(Theme.tint)
                .disabled(isSubmitting || email.isEmpty || password.isEmpty || confirmPassword.isEmpty)

                Button("Already have an account? Sign In") {
                    path.wrappedValue.append(Route.login)
                }
                .disabled(isSubmitting)
            }
            .padding()
        }
    }

    private func signUp() {
        guard password == confirmPassword else {
            error = "Passwords do not match"
            return
        }
        Task {
            error = nil
            isSubmitting = true
            defer { isSubmitting = false }
            do {
                try await auth.signUp(email: email, password: password)
            } catch {
                let message = (error as NSError).localizedDescription
                self.error = message.isEmpty ? "Sign up failed" : message
            }
        }
    }
}
