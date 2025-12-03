/**
 * Quiz Screen
 * 
 * Music taste quiz with multiple choice and slider questions
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QuizAnswers } from '@/types';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const MOODS = [
  { value: 'energetic', label: 'Energetic' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'happy', label: 'Happy' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'peaceful', label: 'Peaceful' },
] as const;

const TEMPOS = [
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
  { value: 'very-fast', label: 'Very Fast' },
] as const;

const GENRES = [
  'Rock',
  'Jazz',
  'Electronic',
  'Hip Hop',
  'Classical',
  'Pop',
  'Metal',
  'Folk',
  'Blues',
  'Country',
  'Reggae',
  'Punk',
  'R&B',
  'Soul',
  'Funk',
  'Disco',
  'Alternative',
  'Indie',
];

const DECADES = [
  { value: '1960s', label: '1960s' },
  { value: '1970s', label: '1970s' },
  { value: '1980s', label: '1980s' },
  { value: '1990s', label: '1990s' },
  { value: '2000s', label: '2000s' },
  { value: '2010s', label: '2010s' },
  { value: '2020s', label: '2020s' },
  { value: 'any', label: 'Any Decade' },
] as const;

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'italian', label: 'Italian' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'all', label: 'All Languages' },
] as const;

export default function QuizScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({
    genres: [],
    format: 'both',
    language: 'all',
  });

  const steps = [
    {
      title: 'What mood are you in?',
      component: (
        <MoodSelector
          selected={answers.mood}
          onSelect={(mood) => setAnswers({ ...answers, mood })}
        />
      ),
    },
    {
      title: 'Preferred tempo?',
      component: (
        <TempoSelector
          selected={answers.tempo}
          onSelect={(tempo) => setAnswers({ ...answers, tempo })}
        />
      ),
    },
    {
      title: 'Favorite genres?',
      component: (
        <GenreSelector
          selected={answers.genres || []}
          onToggle={(genre) => {
            const current = answers.genres || [];
            const updated = current.includes(genre)
              ? current.filter((g) => g !== genre)
              : [...current, genre];
            setAnswers({ ...answers, genres: updated });
          }}
        />
      ),
    },
    {
      title: 'Preferred decade?',
      component: (
        <DecadeSelector
          selected={answers.decade}
          onSelect={(decade) => setAnswers({ ...answers, decade })}
        />
      ),
    },
    {
      title: 'Albums or singles?',
      component: (
        <FormatSelector
          selected={answers.format || 'both'}
          onSelect={(format) => setAnswers({ ...answers, format })}
        />
      ),
    },
    {
      title: 'Preferred language?',
      component: (
        <LanguageSelector
          selected={answers.language || 'all'}
          onSelect={(language) => setAnswers({ ...answers, language })}
        />
      ),
    },
  ];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (
      !answers.mood ||
      !answers.tempo ||
      !answers.genres ||
      answers.genres.length === 0 ||
      !answers.decade ||
      !answers.format ||
      !answers.language
    ) {
      alert('Please answer all questions');
      return;
    }

    setLoading(true);
    router.push({
      pathname: '/auth',
      params: {
        answers: JSON.stringify(answers as QuizAnswers),
      },
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.tint }]} />
        </View>
        <ThemedText style={styles.stepIndicator}>
          {currentStep + 1} of {steps.length}
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          {currentStepData.title}
        </ThemedText>
        <View style={styles.content}>{currentStepData.component}</View>
      </ScrollView>

      <View style={[styles.navigation, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0', backgroundColor: colors.background }]}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleBack}
            disabled={loading}>
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <ThemedText style={styles.nextButtonText}>
              {isLastStep ? 'Finish' : 'Next'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

function MoodSelector({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (mood: QuizAnswers['mood']) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.optionsGrid}>
      {MOODS.map((mood) => (
        <TouchableOpacity
          key={mood.value}
          style={[
            styles.optionButton,
            selected === mood.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(mood.value as QuizAnswers['mood']);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[styles.optionText, selected === mood.value && styles.optionTextSelected]}>
            {mood.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TempoSelector({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (tempo: QuizAnswers['tempo']) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.optionsGrid}>
      {TEMPOS.map((tempo) => (
        <TouchableOpacity
          key={tempo.value}
          style={[
            styles.optionButton,
            selected === tempo.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(tempo.value as QuizAnswers['tempo']);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[styles.optionText, selected === tempo.value && styles.optionTextSelected]}>
            {tempo.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function GenreSelector({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (genre: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.genreGrid}>
      {GENRES.map((genre) => (
        <TouchableOpacity
          key={genre}
          style={[
            styles.genreButton,
            selected.includes(genre) && { backgroundColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle(genre);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[
            styles.genreText,
            selected.includes(genre) && styles.genreTextSelected
          ]}>
            {genre}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DecadeSelector({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (decade: QuizAnswers['decade']) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.optionsGrid}>
      {DECADES.map((decade) => (
        <TouchableOpacity
          key={decade.value}
          style={[
            styles.optionButton,
            selected === decade.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(decade.value as QuizAnswers['decade']);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[styles.optionText, selected === decade.value && styles.optionTextSelected]}>
            {decade.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FormatSelector({
  selected,
  onSelect,
}: {
  selected: 'album' | 'single' | 'both';
  onSelect: (format: QuizAnswers['format']) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const formats = [
    { value: 'album', label: 'Albums' },
    { value: 'single', label: 'Singles' },
    { value: 'both', label: 'Both' },
  ] as const;

  return (
    <View style={styles.optionsGrid}>
      {formats.map((format) => (
        <TouchableOpacity
          key={format.value}
          style={[
            styles.optionButton,
            selected === format.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(format.value);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[styles.optionText, selected === format.value && styles.optionTextSelected]}>
            {format.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LanguageSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (language: QuizAnswers['language']) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <View style={styles.optionsGrid}>
      {LANGUAGES.map((language) => (
        <TouchableOpacity
          key={language.value}
          style={[
            styles.optionButton,
            selected === language.value && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(language.value as QuizAnswers['language']);
          }}
          activeOpacity={0.7}>
          <ThemedText style={[styles.optionText, selected === language.value && styles.optionTextSelected]}>
            {language.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  genreText: {
    fontSize: 15,
    fontWeight: '500',
  },
  genreTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
});
