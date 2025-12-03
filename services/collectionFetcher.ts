/**
 * Collection Fetcher Service
 * 
 * Fetches user's Discogs collection and release metadata
 */

import { makeAuthenticatedRequest, getStoredTokens } from './discogsAuth';
import { CollectionItem, ReleaseData } from '@/types';

/**
 * Fetch all releases from user's collection
 * Note: Discogs API paginates results, so we need to fetch all pages
 */
export async function fetchUserCollection(userId?: string): Promise<CollectionItem[]> {
  const tokens = await getStoredTokens(userId);
  if (!tokens) {
    throw new Error('Not authenticated with Discogs');
  }

  console.log(`Fetching collection for user: ${tokens.username}`);

  const allItems: CollectionItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`Fetching collection page ${page}...`);
      // Use correct endpoint structure: /users/{username}/collection/folders/{folder_id}/releases
      const response = await makeAuthenticatedRequest(
        'GET',
        `/users/${tokens.username}/collection/folders/0/releases`,
        {
          page,
          per_page: 100, // Max per page
        },
        userId
      );

      console.log(`Page ${page} response:`, {
        hasReleases: !!response.releases,
        releasesCount: response.releases?.length || 0,
        pagination: response.pagination,
        responseKeys: Object.keys(response),
      });

      // Check if response has releases array
      if (response.releases && Array.isArray(response.releases)) {
        if (response.releases.length > 0) {
          allItems.push(...response.releases);
          console.log(`Added ${response.releases.length} items. Total: ${allItems.length}`);
          page++;

          // Check if there are more pages
          if (response.pagination) {
            const totalPages = response.pagination.pages || 1;
            console.log(`Total pages: ${totalPages}, Current page: ${page}`);
            hasMore = page <= totalPages;
          } else {
            // If no pagination info, assume no more pages if we got less than per_page
            hasMore = response.releases.length === 100;
          }
        } else {
          console.log('No releases in this page');
          hasMore = false;
        }
      } else {
        // Response might be structured differently
        console.warn('Unexpected response structure:', response);
        // Try to find releases in different possible locations
        if (response.items && Array.isArray(response.items)) {
          allItems.push(...response.items);
          hasMore = false;
        } else {
          console.log('No releases found in response');
          hasMore = false;
        }
      }
    } catch (error: any) {
      console.error(`Error fetching collection page ${page}:`, error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      // Don't stop on first error, but log it
      hasMore = false;
    }
  }

  console.log(`Collection fetch complete. Total items: ${allItems.length}`);
  return allItems;
}

/**
 * Fetch detailed release information
 */
export async function fetchReleaseDetails(releaseId: number, userId?: string): Promise<ReleaseData> {
  try {
    const response = await makeAuthenticatedRequest('GET', `/releases/${releaseId}`, {}, userId);
    
    return {
      id: response.id,
      title: response.title,
      artists: response.artists || [],
      year: response.year || 0,
      genres: response.genres || [],
      styles: response.styles || [],
      tracklist: response.tracklist || [],
      images: response.images || [],
      formats: response.formats || [],
      labels: response.labels || [],
      notes: response.notes,
    };
  } catch (error) {
    console.error(`Error fetching release ${releaseId}:`, error);
    throw error;
  }
}

/**
 * Fetch release details for multiple releases (with rate limiting)
 */
export async function fetchMultipleReleaseDetails(
  releaseIds: number[],
  onProgress?: (current: number, total: number) => void,
  userId?: string
): Promise<Map<number, ReleaseData>> {
  const releaseMap = new Map<number, ReleaseData>();
  
  // Discogs rate limit: 60 requests per minute
  // Add small delay between requests to be safe
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < releaseIds.length; i++) {
    const releaseId = releaseIds[i];
    
    try {
      const releaseData = await fetchReleaseDetails(releaseId, userId);
      releaseMap.set(releaseId, releaseData);
      
      if (onProgress) {
        onProgress(i + 1, releaseIds.length);
      }
      
      // Rate limiting: wait 1.1 seconds between requests (55 requests per minute)
      if (i < releaseIds.length - 1) {
        await delay(1100);
      }
    } catch (error) {
      console.error(`Failed to fetch release ${releaseId}:`, error);
      // Continue with other releases even if one fails
    }
  }

  return releaseMap;
}

