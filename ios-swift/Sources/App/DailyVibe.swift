import Foundation

struct DailyVibe: Hashable {
    let prompt: String
    let subtitle: String
    let moods: [Mood]

    static func current(date: Date = Date(), calendar: Calendar = .current) -> DailyVibe {
        let weekday = calendar.component(.weekday, from: date)
        let hour = calendar.component(.hour, from: date)
        let slot: TimeSlot = .from(hour: hour)
        return prompts[weekday]?[slot] ?? fallback(slot: slot)
    }

    private enum TimeSlot: Hashable {
        case morning, afternoon, evening, night

        static func from(hour: Int) -> TimeSlot {
            switch hour {
            case 5..<12: return .morning
            case 12..<17: return .afternoon
            case 17..<22: return .evening
            default: return .night
            }
        }
    }

    private static func fallback(slot: TimeSlot) -> DailyVibe {
        switch slot {
        case .morning: return DailyVibe(prompt: "Slow-brew morning", subtitle: "Ease into it", moods: [.peaceful, .relaxed])
        case .afternoon: return DailyVibe(prompt: "Afternoon refuel", subtitle: "Keep the engine warm", moods: [.happy])
        case .evening: return DailyVibe(prompt: "Golden-hour glow", subtitle: "Volume up a notch", moods: [.relaxed, .happy])
        case .night: return DailyVibe(prompt: "After-hours hideout", subtitle: "Headphones strongly encouraged", moods: [.relaxed, .melancholic])
        }
    }

    private static let prompts: [Int: [TimeSlot: DailyVibe]] = [
        1: [
            .morning:   DailyVibe(prompt: "Sunday morning coffee", subtitle: "Slippers on. Don't argue.", moods: [.peaceful, .relaxed]),
            .afternoon: DailyVibe(prompt: "Sunday-scaries antidote", subtitle: "Pretend Monday isn't a thing", moods: [.happy, .relaxed]),
            .evening:   DailyVibe(prompt: "Sunday roast soundtrack", subtitle: "Pair with carbs", moods: [.happy, .relaxed]),
            .night:     DailyVibe(prompt: "Sunday-night reset", subtitle: "One more song, then bed", moods: [.peaceful])
        ],
        2: [
            .morning:   DailyVibe(prompt: "Monday motivational mayhem", subtitle: "We can do this. Probably.", moods: [.energetic, .happy]),
            .afternoon: DailyVibe(prompt: "Push through the slump", subtitle: "Coffee #3 says hi", moods: [.energetic]),
            .evening:   DailyVibe(prompt: "Monday survived", subtitle: "You deserve a needle drop", moods: [.relaxed, .happy]),
            .night:     DailyVibe(prompt: "Monday-night wind-down", subtitle: "Bath, but with bass", moods: [.peaceful, .relaxed])
        ],
        3: [
            .morning:   DailyVibe(prompt: "Taco-Tuesday warm-up", subtitle: "Stretch. Spin. Spice.", moods: [.happy, .energetic]),
            .afternoon: DailyVibe(prompt: "Tuesday flow state", subtitle: "Look busy, sound great", moods: [.relaxed]),
            .evening:   DailyVibe(prompt: "Just-add-vinyl Tuesday", subtitle: "Couch and crackle", moods: [.relaxed]),
            .night:     DailyVibe(prompt: "Tuesday cosmic chill", subtitle: "Stare at the ceiling, but make it art", moods: [.peaceful])
        ],
        4: [
            .morning:   DailyVibe(prompt: "Hump-day hype", subtitle: "Halfway there, kid", moods: [.energetic, .happy]),
            .afternoon: DailyVibe(prompt: "Mid-week mellow", subtitle: "Breathe. Then beat.", moods: [.relaxed]),
            .evening:   DailyVibe(prompt: "Wednesday wallow (the good kind)", subtitle: "Feelings, neatly organized", moods: [.melancholic]),
            .night:     DailyVibe(prompt: "Three down, two to go", subtitle: "Wind-down warm-up", moods: [.relaxed, .peaceful])
        ],
        5: [
            .morning:   DailyVibe(prompt: "Almost-Friday energy", subtitle: "Soft launch the weekend", moods: [.energetic, .happy]),
            .afternoon: DailyVibe(prompt: "Thirsty-Thursday tunes", subtitle: "Hydrate to the beat", moods: [.happy]),
            .evening:   DailyVibe(prompt: "Friday-eve dance party", subtitle: "Practice run", moods: [.energetic, .happy]),
            .night:     DailyVibe(prompt: "Thursday-night thinker", subtitle: "Existential, but with rhythm", moods: [.melancholic, .relaxed])
        ],
        6: [
            .morning:   DailyVibe(prompt: "Casual Friday, loud edition", subtitle: "Jeans + jams", moods: [.happy, .energetic]),
            .afternoon: DailyVibe(prompt: "Clock-watching Friday classics", subtitle: "5 PM countdown soundtrack", moods: [.happy]),
            .evening:   DailyVibe(prompt: "Friday-night fire-starter", subtitle: "Pre-game playlist", moods: [.energetic, .aggressive]),
            .night:     DailyVibe(prompt: "Friday after-hours", subtitle: "Stay out. We won't tell.", moods: [.energetic])
        ],
        7: [
            .morning:   DailyVibe(prompt: "Saturday slow brew", subtitle: "No alarm, no problem", moods: [.relaxed, .peaceful]),
            .afternoon: DailyVibe(prompt: "Sunny Saturday spin", subtitle: "Windows down energy", moods: [.happy, .energetic]),
            .evening:   DailyVibe(prompt: "Saturday-night main character", subtitle: "You're the moment", moods: [.energetic, .happy]),
            .night:     DailyVibe(prompt: "Late-Saturday vibes", subtitle: "The good lamp on, the good record on", moods: [.relaxed])
        ]
    ]
}
