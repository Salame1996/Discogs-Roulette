import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, loading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (user) {
      // Try to get Discogs username, otherwise use email
      AsyncStorage.getItem(`discogs_username_${user.id}`).then((discogsUsername) => {
        if (discogsUsername) {
          setDisplayName(discogsUsername);
        } else {
          // Extract username from email (for Discogs users: username@discogs.local)
          const emailParts = user.email.split('@');
          if (emailParts[1] === 'discogs.local') {
            setDisplayName(emailParts[0]);
          } else {
            // For regular users, show email or extract name part
            const namePart = emailParts[0].split('_')[0]; // Remove temp prefixes
            setDisplayName(namePart !== 'discogs' ? user.email : emailParts[0]);
          }
        }
      });
    }
  }, [user, loading]);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Discogs Quiz
        </ThemedText>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <ThemedText style={styles.subtitle}>
            Welcome, {displayName || user.email.split('@')[0]}
          </ThemedText>
          <ThemedText style={styles.description}>
            Discover your next favorite album from your collection
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/quiz');
          }}
          activeOpacity={0.8}>
          <ThemedText style={styles.buttonText}>Start Quiz</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 14,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
