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
      console.log('OAuth callback started');
      console.log('URL params:', params);
      console.log('Current URL:', Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'N/A');
      
      // Get OAuth parameters from URL
      const oauthToken = params.oauth_token as string;
      const oauthVerifier = params.oauth_verifier as string;

      console.log('OAuth token:', oauthToken ? 'Present' : 'Missing');
      console.log('OAuth verifier:', oauthVerifier ? 'Present' : 'Missing');

      if (!oauthToken || !oauthVerifier) {
        const errorMsg = `Missing OAuth parameters. Token: ${oauthToken ? 'present' : 'missing'}, Verifier: ${oauthVerifier ? 'present' : 'missing'}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Construct callback URL
      let callbackUrl: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        callbackUrl = `${window.location.origin}${window.location.pathname}?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`;
        console.log('Constructed callback URL:', callbackUrl);
      } else {
        // For mobile, use the redirect URI from config
        const { DISCOGS_CONFIG } = await import('@/config/discogs');
        callbackUrl = `${DISCOGS_CONFIG.redirectUri}?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`;
        console.log('Mobile callback URL:', callbackUrl);
      }

      // Get the user ID that was stored before OAuth
      let userId = await AsyncStorage.getItem('discogs_oauth_user_id');
      console.log('Stored user ID:', userId || 'Not found');
      
      if (!userId) {
        // Try to get current user
        console.log('No stored user ID, trying to get current user...');
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          throw new Error('No user found. Please sign in first.');
        }
        userId = currentUser.id;
        console.log('Found current user:', userId);
        await AsyncStorage.setItem('discogs_oauth_user_id', userId);
      }

      // Check if request tokens exist before proceeding
      const { getItem } = await import('@/services/storage');
      const requestToken = await getItem('discogs_request_token');
      const requestTokenSecret = await getItem('discogs_request_token_secret');
      console.log('Request token exists:', !!requestToken);
      console.log('Request token secret exists:', !!requestTokenSecret);
      
      if (!requestToken || !requestTokenSecret) {
        throw new Error('Request tokens not found. The OAuth session may have expired. Please try signing in again.');
      }

      console.log('Calling handleAuthCallback...');
      // Handle the callback and get tokens
      const tokens = await handleAuthCallback(callbackUrl);
      console.log('Tokens received:', tokens ? 'Success' : 'Failed');

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
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error to user before redirecting
      const errorMessage = error?.message || 'OAuth authentication failed';
      console.error('Redirecting to login with error:', errorMessage);
      
      // On web, we can show an alert before redirecting
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        alert(`OAuth Error: ${errorMessage}\n\nPlease try signing in again.`);
      }
      
      // Redirect to login with error
      router.replace({
        pathname: '/login',
        params: { error: errorMessage },
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

