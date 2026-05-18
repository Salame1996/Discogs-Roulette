import Foundation

enum Preferences {
    private static var defaults: UserDefaults { .standard }

    static func setString(_ value: String, forKey key: String) {
        defaults.set(value, forKey: key)
    }

    static func string(forKey key: String) -> String? {
        defaults.string(forKey: key)
    }

    static func remove(forKey key: String) {
        defaults.removeObject(forKey: key)
    }

    static func setData(_ data: Data, forKey key: String) {
        defaults.set(data, forKey: key)
    }

    static func data(forKey key: String) -> Data? {
        defaults.data(forKey: key)
    }
}
