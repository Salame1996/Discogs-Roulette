/**
 * Discogs API Configuration
 * 
 * To use this app, you need to:
 * 1. Create a Discogs account at https://www.discogs.com/users/signup
 * 2. Go to https://www.discogs.com/settings/developers
 * 3. Create a new application
 * 4. Copy your Consumer Key and Consumer Secret
 * 5. Set the redirect URIs:
 *    - Mobile: discogsquizapp://oauth/callback
 *    - Web: https://yourdomain.com/oauth/callback (replace with your actual domain)
 * 6. Replace the values below or use environment variables
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get redirect URI based on platform (called at runtime, not module load)
export function getRedirectUri(): string {
  if (Platform.OS === 'web') {
    // For web, use the current origin + /oauth/callback
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Remove trailing slash if present
      const redirectUri = `${origin.replace(/\/$/, '')}/oauth/callback`;
      console.log('Web redirect URI:', redirectUri);
      return redirectUri;
    }
    // Fallback for SSR or build time
    // This will be replaced at runtime
    return '/oauth/callback';
  }
  // For mobile, use the deep link
  return 'discogsquizapp://oauth/callback';
}

// Get from environment variables or use defaults (you should replace these)
// For web, you can use a proxy endpoint to avoid CORS issues
// Set EXPO_PUBLIC_DISCOGS_PROXY_URL to your serverless function URL (e.g., https://your-app.vercel.app/api/discogs-oauth)
const getProxyUrl = (): string | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Check for proxy URL in environment
    const proxyUrl = process.env.EXPO_PUBLIC_DISCOGS_PROXY_URL;
    if (proxyUrl) {
      return proxyUrl;
    }
    // Only use relative path if not in localhost (i.e., deployed)
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.includes('192.168.');
    if (!isLocalhost) {
      // Try relative path for Vercel deployment
      return '/api/discogs-oauth';
    }
    // For localhost, don't use proxy (it doesn't exist)
    return null;
  }
  return null;
};

export const DISCOGS_CONFIG = {
  consumerKey: Constants.expoConfig?.extra?.discogsConsumerKey || 'YOUR_CONSUMER_KEY',
  consumerSecret: Constants.expoConfig?.extra?.discogsConsumerSecret || 'YOUR_CONSUMER_SECRET',
  get redirectUri() {
    // Calculate redirect URI at runtime, not at module load
    return getRedirectUri();
  },
  get proxyUrl() {
    // Get proxy URL at runtime
    return getProxyUrl();
  },
  baseUrl: 'https://api.discogs.com',
  authUrl: 'https://www.discogs.com/oauth/authorize',
  tokenUrl: 'https://api.discogs.com/oauth/access_token',
  requestTokenUrl: 'https://api.discogs.com/oauth/request_token',
};

// Validate that credentials are set
export function validateDiscogsConfig(): boolean {
  if (
    DISCOGS_CONFIG.consumerKey === 'YOUR_CONSUMER_KEY' ||
    DISCOGS_CONFIG.consumerSecret === 'YOUR_CONSUMER_SECRET'
  ) {
    console.warn(
      '⚠️ Discogs credentials not configured. Please set DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET in your environment or app.json extra config.'
    );
    return false;
  }
  return true;
}

