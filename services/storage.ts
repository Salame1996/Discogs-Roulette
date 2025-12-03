/**
 * Cross-platform storage utility
 * Uses SecureStore on mobile, AsyncStorage on web
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Get item from storage
 */
export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    // Fallback to AsyncStorage if SecureStore fails
    return AsyncStorage.getItem(key);
  }
}

/**
 * Set item in storage
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    // Fallback to AsyncStorage if SecureStore fails
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Remove item from storage
 */
export async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    // Fallback to AsyncStorage if SecureStore fails
    await AsyncStorage.removeItem(key);
  }
}

