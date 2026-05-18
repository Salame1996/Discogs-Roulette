import Foundation
import CryptoKit

enum LocalUserAuthError: Error {
    case invalidEmail
    case passwordTooShort
    case emailInUse
    case userNotFound
    case incorrectPassword
}

@MainActor
enum LocalUserAuth {
    private static let emailRegex = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"

    private static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    private static func hash(_ password: String) -> String {
        let digest = SHA256.hash(data: Data(password.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static func validate(email: String, password: String) throws {
        guard email.range(of: emailRegex, options: .regularExpression) != nil else {
            throw LocalUserAuthError.invalidEmail
        }
        guard password.count >= 6 else {
            throw LocalUserAuthError.passwordTooShort
        }
    }

    private static func loadUsers() -> [User] {
        guard let data = Preferences.data(forKey: StorageKeys.appUsers) else { return [] }
        return (try? makeDecoder().decode([User].self, from: data)) ?? []
    }

    private static func saveUsers(_ users: [User]) throws {
        let data = try makeEncoder().encode(users)
        Preferences.setData(data, forKey: StorageKeys.appUsers)
    }

    static func signUp(email: String, password: String) async throws -> User {
        try validate(email: email, password: password)
        let normalizedEmail = email.lowercased()

        var users = loadUsers()
        if users.contains(where: { $0.email.lowercased() == normalizedEmail }) {
            throw LocalUserAuthError.emailInUse
        }

        let user = User(id: UUID().uuidString, email: normalizedEmail, createdAt: Date())
        users.append(user)
        try saveUsers(users)

        try SecureStorage.set(hash(password), forKey: StorageKeys.userPassword(userId: user.id))
        Preferences.setString(user.id, forKey: StorageKeys.currentUserId)

        return user
    }

    static func signIn(email: String, password: String) async throws -> User {
        try validate(email: email, password: password)
        let normalizedEmail = email.lowercased()

        let users = loadUsers()
        guard let user = users.first(where: { $0.email.lowercased() == normalizedEmail }) else {
            throw LocalUserAuthError.userNotFound
        }

        guard let storedHash = SecureStorage.get(forKey: StorageKeys.userPassword(userId: user.id)),
              storedHash == hash(password) else {
            throw LocalUserAuthError.incorrectPassword
        }

        Preferences.setString(user.id, forKey: StorageKeys.currentUserId)
        return user
    }

    static func signOut() {
        Preferences.remove(forKey: StorageKeys.currentUserId)
    }

    static func getCurrentUser() -> User? {
        guard let userId = Preferences.string(forKey: StorageKeys.currentUserId) else { return nil }
        return loadUsers().first(where: { $0.id == userId })
    }

    static func isSignedIn() -> Bool {
        getCurrentUser() != nil
    }
}
