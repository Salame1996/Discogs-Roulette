import SwiftUI

enum Theme {
    static let tint = Color("Tint")
    static let tintForeground = Color("TintForeground")
    static let background = Color("Background")
    static let surfaceElevated = Color("SurfaceElevated")
    static let surfaceMuted = Color("SurfaceMuted")
    static let textPrimary = Color("TextPrimary")
    static let textSecondary = Color("TextSecondary")
    static let accentViolet = Color("AccentViolet")

    static let moodHappy = Color("MoodHappy")
    static let moodSad = Color("MoodSad")
    static let moodChill = Color("MoodChill")
    static let moodWorkout = Color("MoodWorkout")
    static let moodCalm = Color("MoodCalm")
    static let moodHype = Color("MoodHype")

    static let primaryGradient = LinearGradient(
        colors: [Color("Tint"), Color("AccentViolet")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cardCornerRadius: CGFloat = 18
    static let chipCornerRadius: CGFloat = 22

    static let icon = Color("Icon")
    static let tabIconDefault = Color("TabIconDefault")
    static let tabIconSelected = Color("TabIconSelected")
}
