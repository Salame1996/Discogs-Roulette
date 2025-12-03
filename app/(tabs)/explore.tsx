/**
 * Explore Tab
 * 
 * Displays user's entire Discogs collection with sorting and filtering
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserCollection } from '@/services/collectionFetcher';
import { getStoredTokens, initiateAuth, handleAuthCallback } from '@/services/discogsAuth';
import { CollectionItem } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SortOption = 'title' | 'artist' | 'year' | 'dateAdded';

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  const loadCollection = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Check if Discogs is connected
      const tokens = await getStoredTokens(user.id);
      if (!tokens) {
        // User hasn't connected Discogs yet
        console.log('No Discogs tokens found for user');
        setCollection([]);
        return;
      }
      console.log('Fetching collection...');
      const data = await fetchUserCollection(user.id);
      console.log(`Collection loaded: ${data.length} items`);
      setCollection(data);
    } catch (error: any) {
      console.error('Error loading collection:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      // Show error to user
      Alert.alert(
        'Error Loading Collection',
        error.message || 'Failed to load your Discogs collection. Please try again.',
        [
          {
            text: 'Retry',
            onPress: loadCollection,
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollection();
    setRefreshing(false);
  };

  const handleConnectDiscogs = async () => {
    if (!user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setConnecting(true);
      Alert.alert(
        'Connect Discogs',
        'This will open Discogs in your browser to authorize the app.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setConnecting(false),
          },
          {
            text: 'Connect',
            onPress: async () => {
              try {
                const callbackUrl = await initiateAuth(user.id);
                const tokens = await handleAuthCallback(callbackUrl);
                Alert.alert('Success', `Connected as ${tokens.username}`);
                await loadCollection();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to connect Discogs account');
              } finally {
                setConnecting(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start Discogs connection');
      setConnecting(false);
    }
  };

  const filteredAndSortedCollection = useMemo(() => {
    let filtered = [...collection];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const title = item.basic_information.title?.toLowerCase() || '';
        const artist = item.basic_information.artists?.[0]?.name?.toLowerCase() || '';
        const genre = item.basic_information.genres?.join(' ').toLowerCase() || '';
        return title.includes(query) || artist.includes(query) || genre.includes(query);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.basic_information.title || '').localeCompare(b.basic_information.title || '');
        case 'artist':
          const artistA = a.basic_information.artists?.[0]?.name || '';
          const artistB = b.basic_information.artists?.[0]?.name || '';
          return artistA.localeCompare(artistB);
        case 'year':
          return (b.basic_information.year || 0) - (a.basic_information.year || 0);
        case 'dateAdded':
        default:
          const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
          const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
          return dateB - dateA;
      }
    });

    return filtered;
  }, [collection, searchQuery, sortBy]);

  if (loading && collection.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Loading your collection...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.tint + '40' }]}
          placeholder="Search collection..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                sortBy === 'dateAdded' && { backgroundColor: colors.tint },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy('dateAdded');
              }}>
              <ThemedText
                style={[
                  styles.filterText,
                  sortBy === 'dateAdded' && styles.filterTextActive,
                ]}>
                Recent
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                sortBy === 'title' && { backgroundColor: colors.tint },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy('title');
              }}>
              <ThemedText
                style={[
                  styles.filterText,
                  sortBy === 'title' && styles.filterTextActive,
                ]}>
                Title
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                sortBy === 'artist' && { backgroundColor: colors.tint },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy('artist');
              }}>
              <ThemedText
                style={[
                  styles.filterText,
                  sortBy === 'artist' && styles.filterTextActive,
                ]}>
                Artist
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                sortBy === 'year' && { backgroundColor: colors.tint },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortBy('year');
              }}>
              <ThemedText
                style={[
                  styles.filterText,
                  sortBy === 'year' && styles.filterTextActive,
                ]}>
                Year
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ThemedText style={[styles.countText, { color: '#fff' }]}>
          {filteredAndSortedCollection.length} of {collection.length} releases
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }>
        {filteredAndSortedCollection.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              {searchQuery ? (
                'No releases found matching your search'
              ) : (
                'No releases in your collection. Make sure you have items in your Discogs collection at discogs.com'
              )}
            </ThemedText>
            {collection.length === 0 && (
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: colors.tint }]}
                onPress={handleConnectDiscogs}
                disabled={connecting}>
                {connecting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.connectButtonText}>
                    Connect Discogs Account
                  </ThemedText>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredAndSortedCollection.map((item) => (
            <CollectionItemCard key={item.instance_id} item={item} colors={colors} />
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

function CollectionItemCard({
  item,
  colors,
}: {
  item: CollectionItem;
  colors: { tint: string };
}) {
  const router = useRouter();
  const coverImage = item.basic_information.cover_image || item.basic_information.thumb;
  const artistName = item.basic_information.artists?.[0]?.name || 'Unknown Artist';
  const year = item.basic_information.year || 'Unknown Year';
  const genres = item.basic_information.genres?.slice(0, 2) || [];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        // Could navigate to detail view in future
      }}>
      {coverImage && (
        <Image source={{ uri: coverImage }} style={styles.cardImage} contentFit="cover" />
      )}
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle} numberOfLines={2}>
          {item.basic_information.title}
        </ThemedText>
        <ThemedText style={styles.cardArtist} numberOfLines={1}>
          {artistName}
        </ThemedText>
        <View style={styles.cardMeta}>
          <ThemedText style={styles.cardYear}>{year}</ThemedText>
          {genres.length > 0 && (
            <View style={styles.cardGenres}>
              {genres.map((genre, index) => (
                <View key={index} style={[styles.genreBadge, { backgroundColor: '#f0f0f0' }]}>
                  <ThemedText style={styles.genreBadgeText}>
                    {genre}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.8,
    color: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
    color: '#000',
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filters: {
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  countText: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 8,
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  connectButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    color: '#000',
  },
  cardArtist: {
    fontSize: 15,
    opacity: 0.9,
    marginBottom: 10,
    fontWeight: '500',
    color: '#000',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardYear: {
    fontSize: 12,
    opacity: 0.8,
    color: '#000',
  },
  cardGenres: {
    flexDirection: 'row',
    gap: 4,
  },
  genreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
});
