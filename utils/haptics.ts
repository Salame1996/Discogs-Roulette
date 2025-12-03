/**
 * Web-safe haptics utility
 * Only triggers haptics on mobile platforms
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function triggerHaptic(type: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(type);
  }
}

