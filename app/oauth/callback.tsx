/**
 * OAuth Callback Handler for Web
 * 
 * Handles the OAuth callback from Discogs on web
 */

import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { handleAuthCallback } from '@/services/discogsAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '@/services/userAuth';
import { getUserProfile } from '@/services/discogsAuth';
import { useAuth } from '@/contexts/AuthContext';

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get OAuth parameters from URL
      const oauthToken = params.oauth_token as string;
      const oauthVerifier = params.oauth_verifier as string;

      if (!oauthToken || !oauthVerifier) {
        throw new Error('Missing OAuth parameters');
      }

      // Construct callback URL
      let callbackUrl: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        callbackUrl = `${window.location.origin}${window.location.pathname}?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`;
      } else {
        // For mobile, use the redirect URI from config
        const { DISCOGS_CONFIG } = await import('@/config/discogs');
        callbackUrl = `${DISCOGS_CONFIG.redirectUri}?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`;
      }

      // Get the user ID that was stored before OAuth
      let userId = await AsyncStorage.getItem('discogs_oauth_user_id');
      
      if (!userId) {
        // Try to get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          throw new Error('No user found. Please sign in first.');
        }
        userId = currentUser.id;
        await AsyncStorage.setItem('discogs_oauth_user_id', userId);
      }

      // Handle the callback and get tokens
      const tokens = await handleAuthCallback(callbackUrl);

      // Fetch full user profile from Discogs API
      let discogsUsername = tokens.username;
      try {
        const userProfile = await getUserProfile(tokens.username, userId || undefined);
        if (userProfile.username) {
          discogsUsername = userProfile.username;
        }
      } catch (error) {
        console.log('Could not fetch user profile, using username from tokens:', error);
      }

      // Update user email to use Discogs username
      const discogsEmail = `${discogsUsername}@discogs.local`;
      const USERS_STORAGE_KEY = 'app_users';
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (usersJson && userId) {
        const users = JSON.parse(usersJson);
        if (users[userId]) {
          users[userId].email = discogsEmail.toLowerCase();
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }

      // Store Discogs username and set as current user
      if (userId) {
        await AsyncStorage.setItem('current_user_id', userId);
        await AsyncStorage.setItem(`discogs_username_${userId}`, discogsUsername);
      }

      // Refresh auth context
      await refreshUser();

      // Redirect to home
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      // Redirect to login with error
      router.replace({
        pathname: '/login',
        params: { error: error.message || 'OAuth authentication failed' },
      });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.text}>Completing authentication...</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});

