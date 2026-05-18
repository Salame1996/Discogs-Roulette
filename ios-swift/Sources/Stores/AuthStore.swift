import Foundation
import SwiftUI

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var user: User?
    @Published private(set) var discogsUsername: String?
    @Published private(set) var loading: Bool = true

    init() {
        loading = true
        refreshUser()
        loading = false
    }

    func refreshUser() {
        self.user = LocalUserAuth.getCurrentUser()
        refreshDiscogsUsername()
    }

    func refreshDiscogsUsername() {
        guard let userId = self.user?.id else {
            self.discogsUsername = nil
            return
        }
        self.discogsUsername = Preferences.string(forKey: StorageKeys.discogsUsername(userId: userId))
    }

    func signIn(email: String, password: String) async throws {
        let signedInUser = try await LocalUserAuth.signIn(email: email, password: password)
        self.user = signedInUser
        refreshDiscogsUsername()
    }

    func signUp(email: String, password: String) async throws {
        let newUser = try await LocalUserAuth.signUp(email: email, password: password)
        self.user = newUser
        refreshDiscogsUsername()
    }

    func signOut() {
        LocalUserAuth.signOut()
        self.user = nil
        self.discogsUsername = nil
    }

    func signInWithDiscogs() async throws {
        let createdPlaceholder: Bool
        let targetUser: User
        let targetUserId: String

        if let existing = self.user {
            targetUser = existing
            targetUserId = existing.id
            createdPlaceholder = false
        } else {
            let placeholderEmail = "discogs-\(UUID().uuidString.prefix(8))@discogs.local".lowercased()
            let placeholderPassword = UUID().uuidString
            let newUser = try await LocalUserAuth.signUp(email: placeholderEmail, password: placeholderPassword)
            targetUser = newUser
            targetUserId = newUser.id
            createdPlaceholder = true
        }

        do {
            _ = try await DiscogsOAuth.shared.initiateAuth(userId: targetUserId)
            guard DiscogsOAuth.shared.getStoredTokens(userId: targetUserId) != nil else {
                throw NSError(
                    domain: "Auth",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Discogs sign-in did not complete."]
                )
            }
            self.user = targetUser
            refreshDiscogsUsername()
        } catch {
            if createdPlaceholder {
                LocalUserAuth.signOut()
                self.user = nil
                self.discogsUsername = nil
            }
            throw error
        }
    }
}
