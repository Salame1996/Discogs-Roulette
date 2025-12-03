/**
 * User Authentication Service
 * 
 * Handles local user accounts (email + password)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getItem, setItem } from './storage';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

const USERS_STORAGE_KEY = 'app_users';
const CURRENT_USER_KEY = 'current_user_id';
const PASSWORD_PREFIX = 'user_password_';

/**
 * Hash password using SHA-256 (simpler for React Native)
 */
async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Get all users from storage
 */
async function getUsers(): Promise<Record<string, User>> {
  try {
    const usersJson = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  } catch (error) {
    console.error('Error getting users:', error);
    return {};
  }
}

/**
 * Save users to storage
 */
async function saveUsers(users: Record<string, User>): Promise<void> {
  try {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string): Promise<User> {
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }

  // Validate password
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const users = await getUsers();

  // Check if user already exists
  const existingUser = Object.values(users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const user: User = {
    id: userId,
    email: email.toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  // Hash and store password securely
  const hashedPassword = await hashPassword(password);
  await setItem(`${PASSWORD_PREFIX}${userId}`, hashedPassword);

  // Save user
  users[userId] = user;
  await saveUsers(users);

  return user;
}

/**
 * Sign in a user
 */
export async function signIn(email: string, password: string): Promise<User> {
  const users = await getUsers();

  // Find user by email
  const user = Object.values(users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const storedHash = await getItem(`${PASSWORD_PREFIX}${user.id}`);
  if (!storedHash) {
    throw new Error('Invalid email or password');
  }

  const isValid = await verifyPassword(password, storedHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Set current user
  await AsyncStorage.setItem(CURRENT_USER_KEY, user.id);

  return user;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Get current signed in user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userId = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (!userId) {
      return null;
    }

    const users = await getUsers();
    return users[userId] || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is signed in
 */
export async function isSignedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

