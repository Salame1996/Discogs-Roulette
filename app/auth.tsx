/**
 * Discogs Authentication Screen
 * 
 * Handles OAuth flow and fetches user collection
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, Animated, Easing } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initiateAuth, handleAuthCallback, getStoredTokens } from '@/services/discogsAuth';
import { fetchUserCollection, fetchMultipleReleaseDetails } from '@/services/collectionFetcher';
import { filterCollection, broadenFilters, recommendAlbum } from '@/services/recommendationEngine';
import { QuizAnswers } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('Initializing...');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    handleAuthFlow();
  }, []);

  const handleAuthFlow = async () => {
    try {
      let quizAnswers: QuizAnswers;
      try {
        quizAnswers = JSON.parse((params.answers as string) || '{}');
      } catch {
        Alert.alert('Error', 'Invalid quiz data. Please start over.');
        router.replace('/quiz');
        return;
      }

      if (!user) {
        Alert.alert('Error', 'Please sign in first');
        router.replace('/login');
        return;
      }

      const existingTokens = await getStoredTokens(user.id);
      if (existingTokens) {
        setStatus('Already authenticated. Fetching collection...');
        await fetchAndRecommend(quizAnswers, user.id);
        return;
      }

      setStatus('Opening Discogs authentication...');
      const callbackUrl = await initiateAuth(user.id);

      setStatus('Completing authentication...');
      const tokens = await handleAuthCallback(callbackUrl);

      setStatus(`Authenticated as ${tokens.username}. Fetching collection...`);
      await fetchAndRecommend(quizAnswers, user.id);
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert(
        'Authentication Error',
        error.message || 'Failed to authenticate with Discogs. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => handleAuthFlow(),
          },
          {
            text: 'Cancel',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ]
      );
      setLoading(false);
    }
  };

  const fetchAndRecommend = async (quizAnswers: QuizAnswers, userId: string) => {
    try {
      setProgress(10);
      setStatus('Fetching your collection...');
      console.log('Starting collection fetch for user:', userId);
      const collection = await fetchUserCollection(userId);
      console.log(`Collection fetched: ${collection.length} items`);

      if (collection.length === 0) {
        Alert.alert(
          'Empty Collection',
          "Your Discogs collection appears to be empty. Please make sure:\n\n1. You have releases in your Discogs collection at discogs.com\n2. Your collection is in the default folder (folder 0)\n3. Try refreshing or check the Explore tab",
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
        return;
      }

      setProgress(30);
      setStatus(`Found ${collection.length} releases. Filtering...`);
      
      let filtered = filterCollection(collection, quizAnswers);
      
      if (filtered.length === 0) {
        setProgress(40);
        setStatus('No exact matches. Broadening filters...');
        filtered = broadenFilters(collection, quizAnswers);
      }

      if (filtered.length === 0) {
        Alert.alert(
          'No Matches',
          "Couldn't find any albums matching your preferences. Try adjusting your quiz answers.",
          [
            {
              text: 'Retake Quiz',
              onPress: () => router.replace('/quiz'),
            },
          ]
        );
        return;
      }

      setProgress(50);
      setStatus('Fetching release details...');
      
      const topMatches = filtered.slice(0, 10);
      const releaseIds = topMatches.map((item) => item.basic_information.id);
      const releaseDataMap = await fetchMultipleReleaseDetails(releaseIds, (current, total) => {
        const percentage = Math.round((current / total) * 100);
        const progressValue = 50 + Math.round((percentage / 100) * 40); // 50-90%
        setProgress(progressValue);
        setStatus(`Fetching release details... ${percentage}%`);
      }, userId);

      setProgress(90);
      setStatus('Finding your perfect match...');
      
      const recommendation = recommendAlbum(filtered, quizAnswers, releaseDataMap);

      if (!recommendation) {
        Alert.alert(
          'Error',
          'Failed to generate recommendation. Please try again.',
          [
            {
              text: 'Retry',
              onPress: () => fetchAndRecommend(quizAnswers),
            },
          ]
        );
        return;
      }

      router.replace({
        pathname: '/recommendation',
        params: {
          recommendation: JSON.stringify(recommendation),
        },
      });
    } catch (error: any) {
      console.error('Fetch error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to fetch collection. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => fetchAndRecommend(quizAnswers),
          },
          {
            text: 'Cancel',
            onPress: () => router.back(),
            style: 'cancel',
          },
        ]
      );
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {loading && <VinylPlayer progress={progress} />}
        <ThemedText type="title" style={styles.title}>
          Connecting to Discogs
        </ThemedText>
        <ThemedText style={styles.status}>{status}</ThemedText>
      </View>
    </ThemedView>
  );
}

function VinylPlayer({ progress = 0 }: { progress?: number }) {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate progress angle (0-360 degrees, starting from top)
  const progressAngle = (progress / 100) * 360;

  return (
    <View style={styles.vinylContainer}>
      {/* Needle */}
      <View style={styles.needleContainer}>
        <View style={styles.needleBase} />
        <View style={styles.needle} />
      </View>
      {/* Vinyl Record */}
      <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }] }]}>
        <View style={styles.vinylOuter}>
          {/* Progress Fill Background */}
          <View style={styles.progressBackground} />
          {/* Progress Fill - Rotating overlay */}
          <View
            style={[
              styles.progressFill,
              {
                transform: [{ rotate: `${progressAngle - 90}deg` }],
              },
            ]}
          />
          <View style={styles.vinylInner} />
          <View style={styles.vinylCenter} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  vinylContainer: {
    width: 200,
    height: 200,
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleContainer: {
    position: 'absolute',
    top: 10,
    left: '50%',
    width: 60,
    height: 100,
    zIndex: 10,
    transform: [{ translateX: -30 }],
  },
  needleBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    position: 'absolute',
    top: 0,
    left: 18,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  needle: {
    width: 3,
    height: 70,
    backgroundColor: '#555',
    position: 'absolute',
    top: 24,
    left: 28,
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    transform: [{ rotate: '20deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  vinyl: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBackground: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0a7ea4',
    opacity: 0.3,
  },
  progressFill: {
    position: 'absolute',
    width: 90,
    height: 180,
    backgroundColor: '#1a1a1a',
    left: 90,
    top: 0,
    transformOrigin: 'left center',
  },
  vinylInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    zIndex: 1,
  },
  vinylCenter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000',
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#333',
    zIndex: 2,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  status: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
  },
});
