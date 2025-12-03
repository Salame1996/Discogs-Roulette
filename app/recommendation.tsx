/**
 * Recommendation Screen
 * 
 * Displays the recommended album with cover art, metadata, and explanation
 */

import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Recommendation } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RecommendationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  let recommendation: Recommendation;
  try {
    recommendation = JSON.parse((params.recommendation as string) || '{}');
  } catch {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Error loading recommendation</ThemedText>
      </ThemedView>
    );
  }

  const { releaseData, matchScore, reasons } = recommendation;
  const coverImage = releaseData.images?.[0]?.uri || releaseData.images?.[0]?.resource_url;
  const artistName = releaseData.artists?.[0]?.name || 'Unknown Artist';
  const tracklist = releaseData.tracklist?.slice(0, 10) || [];

  const getScoreColor = (score: number): string => {
    if (score >= 0 && score < 25) {
      return '#ef4444'; // red
    } else if (score >= 25 && score < 50) {
      return '#f97316'; // orange
    } else if (score >= 50 && score < 75) {
      return '#3b82f6'; // blue
    } else {
      return '#22c55e'; // green
    }
  };

  const handleViewOnDiscogs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const discogsUrl = `https://www.discogs.com/release/${releaseData.id}`;
    Linking.openURL(discogsUrl);
  };

  const handleNewQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/quiz');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {coverImage && (
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: coverImage }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        <View style={styles.infoContainer}>
          <ThemedText type="title" style={styles.albumTitle}>
            {releaseData.title}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.artistName}>
            {artistName}
          </ThemedText>
          {releaseData.year && (
            <ThemedText style={styles.year}>{releaseData.year}</ThemedText>
          )}

          {releaseData.genres && releaseData.genres.length > 0 && (
            <View style={styles.genresContainer}>
              {releaseData.genres.map((genre, index) => (
                <View key={index} style={[styles.genreTag, { backgroundColor: colors.tint + '20' }]}>
                  <ThemedText style={[styles.genreText, { color: colors.tint }]}>{genre}</ThemedText>
                </View>
              ))}
            </View>
          )}

          <View style={styles.scoreContainer}>
            <ThemedText style={styles.scoreLabel}>Match Score</ThemedText>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreFill,
                  { width: `${Math.min(matchScore, 100)}%`, backgroundColor: getScoreColor(matchScore) },
                ]}
              />
            </View>
            <ThemedText style={[styles.scoreValue, { color: getScoreColor(matchScore) }]}>{matchScore}/100</ThemedText>
          </View>

          <View style={styles.reasonsContainer}>
            <ThemedText type="subtitle" style={styles.reasonsTitle}>
              Why this album?
            </ThemedText>
            {reasons.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <ThemedText style={styles.reasonBullet}>•</ThemedText>
                <ThemedText style={styles.reasonText}>{reason}</ThemedText>
              </View>
            ))}
          </View>

          {tracklist.length > 0 && (
            <View style={styles.tracklistContainer}>
              <ThemedText type="subtitle" style={styles.tracklistTitle}>
                Tracklist
              </ThemedText>
              {tracklist.map((track, index) => (
                <View key={index} style={styles.trackItem}>
                  <ThemedText style={styles.trackPosition}>
                    {track.position || `${index + 1}.`}
                  </ThemedText>
                  <View style={styles.trackInfo}>
                    <ThemedText style={styles.trackTitle}>{track.title}</ThemedText>
                    {track.duration && (
                      <ThemedText style={styles.trackDuration}>{track.duration}</ThemedText>
                    )}
                  </View>
                </View>
              ))}
              {releaseData.tracklist && releaseData.tracklist.length > 10 && (
                <ThemedText style={styles.moreTracks}>
                  + {releaseData.tracklist.length - 10} more tracks
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actionsContainer, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0' }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#000', borderWidth: 0 }]}
          onPress={handleViewOnDiscogs}
          activeOpacity={0.7}>
          <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
            View on Discogs
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={handleNewQuiz}
          activeOpacity={0.8}>
          <ThemedText style={styles.primaryButtonText}>New Quiz</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  infoContainer: {
    padding: 24,
  },
  albumTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  artistName: {
    fontSize: 20,
    marginBottom: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
  year: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.6,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  genreTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreContainer: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#f9f9f9',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
    opacity: 0.7,
    color: '#000',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  reasonsContainer: {
    marginBottom: 32,
  },
  reasonsTitle: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: '700',
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  reasonBullet: {
    marginRight: 12,
    fontSize: 18,
    opacity: 0.6,
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  tracklistContainer: {
    marginBottom: 24,
  },
  tracklistTitle: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: '700',
  },
  trackItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackPosition: {
    width: 40,
    fontSize: 15,
    opacity: 0.5,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  trackDuration: {
    fontSize: 13,
    opacity: 0.6,
  },
  moreTracks: {
    marginTop: 12,
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.6,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
