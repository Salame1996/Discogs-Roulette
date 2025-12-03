import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Sign In', presentation: 'card' }} />
          <Stack.Screen name="signup" options={{ title: 'Sign Up', presentation: 'card' }} />
          <Stack.Screen name="quiz" options={{ title: 'Music Taste Quiz', presentation: 'card', headerBackTitle: 'Home' }} />
          <Stack.Screen name="auth" options={{ title: 'Authenticating', presentation: 'card' }} />
          <Stack.Screen name="recommendation" options={{ title: 'Your Recommendation', presentation: 'card' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
