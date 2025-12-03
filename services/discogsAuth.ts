/**
 * Discogs OAuth2 Authentication Service
 * 
 * Handles OAuth 1.0a flow for Discogs API authentication
 * Note: Discogs uses OAuth 1.0a, not OAuth2 despite the naming
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { DISCOGS_CONFIG } from '@/config/discogs';
import axios from 'axios';
import { getItem, setItem, removeItem } from './storage';

// Token storage keys - will be prefixed with user ID
const TOKEN_STORAGE_KEY_PREFIX = 'discogs_access_token_';
const TOKEN_SECRET_STORAGE_KEY_PREFIX = 'discogs_access_token_secret_';
const USERNAME_STORAGE_KEY_PREFIX = 'discogs_username_';

interface OAuthTokens {
  token: string;
  tokenSecret: string;
}

interface AccessTokens extends OAuthTokens {
  username: string;
}

// Note: OAuth signature generation removed - using PLAINTEXT method directly in functions

/**
 * Generate OAuth header string
 */
function generateOAuthHeader(params: Record<string, string>): string {
  const oauthParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
    .join(', ');

  return `OAuth ${oauthParams}`;
}

/**
 * Get stored access tokens for a user
 */
export async function getStoredTokens(userId?: string): Promise<AccessTokens | null> {
  if (!userId) {
    // Try to get current user ID from AsyncStorage
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const currentUserId = await AsyncStorage.getItem('current_user_id');
    if (!currentUserId) return null;
    userId = currentUserId;
  }

  try {
    const token = await getItem(`${TOKEN_STORAGE_KEY_PREFIX}${userId}`);
    const tokenSecret = await getItem(`${TOKEN_SECRET_STORAGE_KEY_PREFIX}${userId}`);
    const username = await getItem(`${USERNAME_STORAGE_KEY_PREFIX}${userId}`);

    if (token && tokenSecret && username) {
      return { token, tokenSecret, username };
    }
    return null;
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}

/**
 * Store access tokens securely for a user
 */
async function storeTokens(tokens: AccessTokens, userId?: string): Promise<void> {
  if (!userId) {
    // Get current user ID from AsyncStorage
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const currentUserId = await AsyncStorage.getItem('current_user_id');
    if (!currentUserId) {
      throw new Error('No user logged in');
    }
    userId = currentUserId;
  }

  try {
    await setItem(`${TOKEN_STORAGE_KEY_PREFIX}${userId}`, tokens.token);
    await setItem(`${TOKEN_SECRET_STORAGE_KEY_PREFIX}${userId}`, tokens.tokenSecret);
    await setItem(`${USERNAME_STORAGE_KEY_PREFIX}${userId}`, tokens.username);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
}

/**
 * Clear stored tokens for a user (logout)
 */
export async function clearStoredTokens(userId?: string): Promise<void> {
  if (!userId) {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const currentUserId = await AsyncStorage.getItem('current_user_id');
    if (!currentUserId) return;
    userId = currentUserId;
  }

  try {
    await removeItem(`${TOKEN_STORAGE_KEY_PREFIX}${userId}`);
    await removeItem(`${TOKEN_SECRET_STORAGE_KEY_PREFIX}${userId}`);
    await removeItem(`${USERNAME_STORAGE_KEY_PREFIX}${userId}`);
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

/**
 * Generate random nonce
 */
async function generateNonce(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Step 1: Get request token
 */
async function getRequestToken(): Promise<OAuthTokens> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = await generateNonce();

  // Get redirect URI at runtime
  const redirectUri = DISCOGS_CONFIG.redirectUri;
  console.log('Using redirect URI:', redirectUri);
  console.log('Consumer Key:', DISCOGS_CONFIG.consumerKey ? 'SET' : 'MISSING');
  console.log('Consumer Secret:', DISCOGS_CONFIG.consumerSecret ? 'SET' : 'MISSING');

  // Validate credentials
  if (!DISCOGS_CONFIG.consumerKey || DISCOGS_CONFIG.consumerKey === 'YOUR_CONSUMER_KEY') {
    throw new Error('Discogs Consumer Key is not configured. Please set DISCOGS_CONSUMER_KEY in your environment variables.');
  }
  if (!DISCOGS_CONFIG.consumerSecret || DISCOGS_CONFIG.consumerSecret === 'YOUR_CONSUMER_SECRET') {
    throw new Error('Discogs Consumer Secret is not configured. Please set DISCOGS_CONSUMER_SECRET in your environment variables.');
  }

  const params: Record<string, string> = {
    oauth_consumer_key: DISCOGS_CONFIG.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'PLAINTEXT',
    oauth_timestamp: timestamp,
    oauth_callback: redirectUri,
  };

  // For PLAINTEXT method (Discogs supports this for request token)
  const signature = `${encodeURIComponent(DISCOGS_CONFIG.consumerSecret)}&`;

  params.oauth_signature = signature;

  const authHeader = generateOAuthHeader(params);
  const url = `${DISCOGS_CONFIG.requestTokenUrl}?oauth_callback=${encodeURIComponent(redirectUri)}`;

  try {
    // On web, we MUST use a proxy to avoid CORS issues
    // On mobile, we can make direct requests
    const proxyUrl = Platform.OS === 'web' ? DISCOGS_CONFIG.proxyUrl : null;
    
    console.log('Requesting token...');
    console.log('Platform:', Platform.OS);
    console.log('Using proxy:', !!proxyUrl);
    console.log('With redirect URI:', redirectUri);
    
    // On web, if there's no proxy, we can't proceed
    if (Platform.OS === 'web' && !proxyUrl) {
      throw new Error(
        'Discogs OAuth requires a backend proxy on web due to CORS restrictions.\n\n' +
        'To fix this:\n' +
        '1. Deploy your app to Vercel (the /api/discogs-oauth.js serverless function will be available)\n' +
        '2. Or set EXPO_PUBLIC_DISCOGS_PROXY_URL to point to your backend proxy\n\n' +
        'For local development, please use the mobile version or deploy to Vercel first.'
      );
    }
    
    let response;
    if (proxyUrl) {
      // Use proxy endpoint (web only)
      try {
        console.log('Requesting token via proxy:', proxyUrl);
        response = await axios.post(
          proxyUrl,
          {
            action: 'request_token',
            authHeader: authHeader,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (proxyError: any) {
        // If proxy returns 404, it means it's not deployed yet
        if (proxyError?.response?.status === 404) {
          throw new Error(
            'OAuth proxy endpoint not found (404). The /api/discogs-oauth endpoint is only available when deployed to Vercel.\n\n' +
            'For local development, please:\n' +
            '1. Deploy the app to Vercel, or\n' +
            '2. Use the mobile version which works without a backend\n\n' +
            'The serverless function file is located at /api/discogs-oauth.js'
          );
        }
        throw proxyError;
      }
    } else {
      // Direct request (mobile only - this works because mobile doesn't have CORS restrictions)
      console.log('Requesting token directly (mobile):', DISCOGS_CONFIG.requestTokenUrl);
      response = await axios.post(
        DISCOGS_CONFIG.requestTokenUrl,
        {},
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );
    }

    console.log('Request token response received');
    // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy)
    const tokenData: Record<string, string> = {};
    response.data.split('&').forEach((pair: string) => {
      const [key, value] = pair.split('=');
      tokenData[key] = decodeURIComponent(value);
    });

    if (!tokenData.oauth_token || !tokenData.oauth_token_secret) {
      console.error('Invalid token response:', response.data);
      throw new Error('Invalid response from Discogs: missing tokens');
    }

    console.log('Request token received successfully');
    return {
      token: tokenData.oauth_token,
      tokenSecret: tokenData.oauth_token_secret,
    };
  } catch (error: any) {
    console.error('Error getting request token:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    }
    if (error.request) {
      console.error('Request was made but no response received:', error.request);
    }
    const errorMessage = error?.response?.data || error?.message || 'Unknown error';
    throw new Error(`Failed to get request token: ${typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage)}`);
  }
}

/**
 * Step 2: Open browser for user authorization
 */
export async function initiateAuth(userId?: string): Promise<string> {
  try {
    // Store userId temporarily for the callback
    if (userId) {
      await setItem('discogs_oauth_user_id', userId);
    } else {
      // Try to get current user ID
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const currentUserId = await AsyncStorage.getItem('current_user_id');
      if (currentUserId) {
        await setItem('discogs_oauth_user_id', currentUserId);
      }
    }

    console.log('Getting request token...');
    const requestTokens = await getRequestToken();
    console.log('Request token received');
    
    // Store request tokens temporarily (we'll need them in the callback)
    await setItem('discogs_request_token', requestTokens.token);
    await setItem('discogs_request_token_secret', requestTokens.tokenSecret);

    const authUrl = `${DISCOGS_CONFIG.authUrl}?oauth_token=${requestTokens.token}`;
    console.log('Auth URL:', authUrl);
    console.log('Redirect URI:', DISCOGS_CONFIG.redirectUri);
    
    // On web, redirect directly to Discogs
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        console.log('Redirecting to Discogs on web...');
        console.log('Auth URL:', authUrl);
        console.log('About to redirect - this should open Discogs...');
        // Redirect to Discogs OAuth page immediately
        // Use replace to avoid back button issues
        // Force immediate redirect
        try {
          window.location.replace(authUrl);
          // Fallback in case replace doesn't work
          setTimeout(() => {
            if (window.location.href !== authUrl) {
              console.log('Replace failed, trying href...');
              window.location.href = authUrl;
            }
          }, 100);
        } catch (error) {
          console.error('Error during redirect:', error);
          // Last resort - try direct assignment
          window.location.href = authUrl;
        }
        // Return a promise that will never resolve (page is redirecting)
        // This prevents the calling code from continuing
        return new Promise<string>(() => {
          // Never resolves - page is redirecting
        });
      }
      throw new Error('Window object not available');
    }
    
    // For mobile, use WebBrowser
    const result = await WebBrowser.openAuthSessionAsync(authUrl, DISCOGS_CONFIG.redirectUri);
    
    if (result.type === 'success' && result.url) {
      return result.url;
    }
    
    throw new Error('Authentication cancelled or failed');
  } catch (error: any) {
    console.error('Error in initiateAuth:', error);
    throw error;
  }
}

/**
 * Step 3: Exchange request token for access token
 */
export async function handleAuthCallback(callbackUrl: string): Promise<AccessTokens> {
  // Extract oauth_verifier from callback URL
  // Parse URL manually for React Native compatibility
  const urlParts = callbackUrl.split('?');
  if (urlParts.length < 2) {
    throw new Error('Invalid callback URL format');
  }
  
  const urlParams: Record<string, string> = {};
  urlParts[1].split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    urlParams[key] = decodeURIComponent(value || '');
  });
  
  const oauthVerifier = urlParams.oauth_verifier;
  const oauthToken = urlParams.oauth_token;

  if (!oauthVerifier || !oauthToken) {
    throw new Error('Invalid callback URL');
  }

  // Get stored request tokens
  const requestToken = await getItem('discogs_request_token');
  const requestTokenSecret = await getItem('discogs_request_token_secret');

  if (!requestToken || !requestTokenSecret) {
    throw new Error('Request tokens not found');
  }

  // Clean up request tokens
  await removeItem('discogs_request_token');
  await removeItem('discogs_request_token_secret');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = await generateNonce();

  const params: Record<string, string> = {
    oauth_consumer_key: DISCOGS_CONFIG.consumerKey,
    oauth_token: oauthToken,
    oauth_nonce: nonce,
    oauth_signature_method: 'PLAINTEXT',
    oauth_timestamp: timestamp,
    oauth_verifier: oauthVerifier,
  };

  const signature = `${encodeURIComponent(DISCOGS_CONFIG.consumerSecret)}&${encodeURIComponent(requestTokenSecret)}`;
  params.oauth_signature = signature;

  const authHeader = generateOAuthHeader(params);

  try {
    const response = await axios.post(
      DISCOGS_CONFIG.tokenUrl,
      {},
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    // Parse response
    const tokenData: Record<string, string> = {};
    response.data.split('&').forEach((pair: string) => {
      const [key, value] = pair.split('=');
      tokenData[key] = decodeURIComponent(value);
    });

    // Get user ID that was stored before OAuth flow
    let userId = await getItem('discogs_oauth_user_id');
    if (!userId) {
      // Fallback: try to get current user ID
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const currentUserId = await AsyncStorage.getItem('current_user_id');
      if (!currentUserId) {
        throw new Error('No user logged in');
      }
      userId = currentUserId;
    }
    
    // Clean up temporary user ID storage
    await removeItem('discogs_oauth_user_id');

    // Fetch username from Discogs identity endpoint
    try {
      // Make identity request with the tokens we just received
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = await generateNonce();
      const url = `${DISCOGS_CONFIG.baseUrl}/oauth/identity`;
      const allParams: Record<string, string> = {
        oauth_consumer_key: DISCOGS_CONFIG.consumerKey,
        oauth_token: tokenData.oauth_token,
        oauth_nonce: nonce,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: timestamp,
      };
      const signature = `${encodeURIComponent(DISCOGS_CONFIG.consumerSecret)}&${encodeURIComponent(tokenData.oauth_token_secret)}`;
      allParams.oauth_signature = signature;
      const authHeader = generateOAuthHeader(allParams);
      
      const identityResponse = await axios.get(url, {
        headers: {
          Authorization: authHeader,
          'User-Agent': 'DiscogsQuizApp/1.0',
        },
      });
      
      // Use the username from identity endpoint
      const username = identityResponse.data.username || tokenData.username || 'unknown';
      console.log('Fetched username from identity endpoint:', username);
      
      const accessTokens: AccessTokens = {
        token: tokenData.oauth_token,
        tokenSecret: tokenData.oauth_token_secret,
        username: username,
      };
      
      await storeTokens(accessTokens, userId);
      return accessTokens;
    } catch (error: any) {
      console.error('Error fetching username from identity endpoint:', error);
      console.error('Error response:', error.response?.data);
      // Fallback to username from token response if available
      const username = tokenData.username || 'unknown';
      console.log('Using username from token response:', username);
      
      const accessTokens: AccessTokens = {
        token: tokenData.oauth_token,
        tokenSecret: tokenData.oauth_token_secret,
        username: username,
      };
      await storeTokens(accessTokens, userId);
      return accessTokens;
    }
  } catch (error) {
    console.error('Error exchanging tokens:', error);
    throw new Error('Failed to exchange tokens');
  }
}

/**
 * Get user profile from Discogs API
 */
export async function getUserProfile(username: string, userId?: string): Promise<any> {
  return makeAuthenticatedRequest('GET', `/users/${username}`, {}, userId);
}

/**
 * Make authenticated API request
 */
export async function makeAuthenticatedRequest(
  method: string,
  endpoint: string,
  params: Record<string, any> = {},
  userId?: string
): Promise<any> {
  const tokens = await getStoredTokens(userId);
  if (!tokens) {
    throw new Error('Not authenticated with Discogs');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = await generateNonce();

  const url = `${DISCOGS_CONFIG.baseUrl}${endpoint}`;
  const allParams: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
    oauth_consumer_key: DISCOGS_CONFIG.consumerKey,
    oauth_token: tokens.token,
    oauth_nonce: nonce,
    oauth_signature_method: 'PLAINTEXT', // Using PLAINTEXT for React Native compatibility
    oauth_timestamp: timestamp,
  };

  // PLAINTEXT signature (Discogs supports this)
  const signature = `${encodeURIComponent(DISCOGS_CONFIG.consumerSecret)}&${encodeURIComponent(tokens.tokenSecret)}`;
  allParams.oauth_signature = signature;

  const authHeader = generateOAuthHeader(allParams);

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url,
      headers: {
        Authorization: authHeader,
        'User-Agent': 'DiscogsQuizApp/1.0',
      },
      params: method.toUpperCase() === 'GET' ? params : undefined,
      data: method.toUpperCase() !== 'GET' ? params : undefined,
    });

    return response.data;
  } catch (error: any) {
    console.error('API request error:', error.response?.data || error.message);
    throw error;
  }
}

