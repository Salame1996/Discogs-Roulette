/**
 * Login Screen
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initiateAuth, handleAuthCallback, getUserProfile } from '@/services/discogsAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signUp as userSignUp, signIn as userSignIn } from '@/services/userAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [discogsLoading, setDiscogsLoading] = useState(false);

  const handleLogin = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscogsSignIn = async () => {
    console.log('handleDiscogsSignIn called');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDiscogsLoading(true);
    try {
      console.log('Creating temporary user account...');
      // Create a temporary user account first (we'll update it after OAuth)
      // This gives us a userId to use for storing Discogs tokens
      const tempEmail = `discogs_temp_${Date.now()}@discogs.local`;
      const tempPassword = `discogs_${Math.random().toString(36).substr(2, 16)}`;
      
      let user;
      try {
        user = await userSignUp(tempEmail, tempPassword);
        console.log('User created:', user.id);
      } catch (error: any) {
        console.log('Signup failed, trying sign in:', error);
        // If signup fails, try signing in (shouldn't happen with timestamp, but just in case)
        user = await userSignIn(tempEmail, tempPassword);
        console.log('User signed in:', user.id);
      }
      
      // Set as current user so OAuth can use it
      await AsyncStorage.setItem('current_user_id', user.id);
      console.log('Current user ID set');
      
      // On web, initiateAuth will redirect the page, so we don't need to handle callback here
      if (Platform.OS === 'web') {
        console.log('Platform is web, starting OAuth flow...');
        // For web, initiateAuth redirects the page
        // The callback will be handled by /oauth/callback route
        try {
          // Call initiateAuth - it will redirect the page
          // We don't await because the redirect happens synchronously
          initiateAuth(user.id).catch((error: any) => {
            console.error('Error in initiateAuth (async):', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            setDiscogsLoading(false);
            
            // Check if it's a CORS error
            const isCorsError = error?.message?.includes('CORS') || 
                               error?.message?.includes('Network Error') ||
                               error?.code === 'ERR_NETWORK' ||
                               error?.message?.includes('Failed to get request token');
            
            if (isCorsError && Platform.OS === 'web') {
              Alert.alert(
                'Backend Required for Web',
                'Discogs OAuth requires a backend server to handle the request token due to CORS restrictions.\n\n' +
                'To fix this:\n' +
                '1. Deploy the /api/discogs-oauth.js serverless function to Vercel\n' +
                '2. Set DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET in Vercel environment variables\n' +
                '3. Update the app to use the proxy endpoint\n\n' +
                'For now, please use the mobile app version which works without a backend.'
              );
            } else {
              const errorMsg = error?.response?.data || error?.message || 'Failed to start authentication. Please check your Discogs credentials and redirect URI settings.';
              Alert.alert(
                'Discogs Sign In Failed',
                typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
              );
            }
          });
          // The redirect should happen immediately
          // If we reach here, something went wrong
          console.log('initiateAuth called, waiting for redirect...');
          // Give it a moment, then check if redirect happened
          setTimeout(() => {
            if (window.location.href.includes('discogs.com')) {
              console.log('Redirect successful!');
            } else {
              console.warn('Redirect may not have happened. Current URL:', window.location.href);
            }
          }, 500);
          return;
        } catch (error: any) {
          console.error('Error initiating auth on web (sync):', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          setDiscogsLoading(false);
          Alert.alert(
            'Discogs Sign In Failed',
            error?.message || 'Failed to start authentication. Please try again.'
          );
          return;
        }
      }
      
      // For mobile, handle the callback normally
      const callbackUrl = await initiateAuth(user.id);
      const tokens = await handleAuthCallback(callbackUrl);
      
      // Fetch full user profile from Discogs API to get verified username
      let discogsUsername = tokens.username;
      try {
        const userProfile = await getUserProfile(tokens.username, user.id);
        if (userProfile.username) {
          discogsUsername = userProfile.username;
        }
      } catch (error) {
        console.log('Could not fetch user profile, using username from tokens:', error);
      }
      
      // Now update the user's email to use the actual Discogs username
      const discogsEmail = `${discogsUsername}@discogs.local`;
      
      // Update user record with Discogs username
      const USERS_STORAGE_KEY = 'app_users';
      const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      if (usersJson) {
        const users = JSON.parse(usersJson);
        if (users[user.id]) {
          users[user.id].email = discogsEmail.toLowerCase();
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }
      
      // Also store the Discogs username separately for easy access
      await AsyncStorage.setItem(`discogs_username_${user.id}`, discogsUsername);
      
      // Refresh auth context to get updated user
      await refreshUser();
      
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Discogs sign in error:', error);
      console.error('Error stack:', error.stack);
      setDiscogsLoading(false);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to sign in with Discogs. Please try again.';
      Alert.alert(
        'Discogs Sign In Failed',
        errorMessage
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to continue
          </ThemedText>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint + '40' }]}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.tint + '40' }]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={handleLogin}
              disabled={loading || discogsLoading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>OR</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.discogsButton, { borderColor: colors.tint }]}
              onPress={() => {
                console.log('Discogs button clicked!');
                handleDiscogsSignIn();
              }}
              disabled={loading || discogsLoading}
              activeOpacity={0.8}>
              {discogsLoading ? (
                <ActivityIndicator color={colors.tint} />
              ) : (
                <ThemedText style={[styles.discogsButtonText, { color: colors.tint }]}>
                  Sign in with Discogs
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/signup');
              }}>
              <ThemedText style={styles.linkText}>
                Don't have an account? <ThemedText style={[styles.linkText, { color: colors.tint }]}>Sign Up</ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.5,
  },
  discogsButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
    minHeight: 52,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
    }),
  },
  discogsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

