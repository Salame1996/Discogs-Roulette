/**
 * Recommendation Engine
 * 
 * Filters and scores collection items based on quiz answers
 */

import { QuizAnswers, CollectionItem, ReleaseData, Recommendation } from '@/types';

/**
 * Map quiz answers to filtering criteria
 */
interface FilterCriteria {
  genres: string[];
  decade: { min: number; max: number } | null;
  mood: string[];
  tempo: string[];
  format: 'album' | 'single' | 'both';
}

/**
 * Convert quiz answers to filter criteria
 */
function quizToFilterCriteria(answers: QuizAnswers): FilterCriteria {
  // Map decade to year range
  const decadeMap: Record<string, { min: number; max: number }> = {
    '1960s': { min: 1960, max: 1969 },
    '1970s': { min: 1970, max: 1979 },
    '1980s': { min: 1980, max: 1989 },
    '1990s': { min: 1990, max: 1999 },
    '2000s': { min: 2000, max: 2009 },
    '2010s': { min: 2010, max: 2019 },
    '2020s': { min: 2020, max: 2029 },
  };

  // Map mood to genre/style keywords
  const moodMap: Record<string, string[]> = {
    energetic: ['energetic', 'upbeat', 'dance', 'electronic', 'rock', 'punk'],
    relaxed: ['ambient', 'chill', 'jazz', 'lounge', 'smooth', 'soft'],
    melancholic: ['sad', 'melancholic', 'depressive', 'dark', 'gothic', 'doom'],
    happy: ['happy', 'upbeat', 'pop', 'cheerful', 'bright'],
    aggressive: ['aggressive', 'metal', 'hardcore', 'punk', 'thrash'],
    peaceful: ['ambient', 'meditation', 'new age', 'calm', 'peaceful'],
  };

  // Map tempo to style keywords
  const tempoMap: Record<string, string[]> = {
    slow: ['slow', 'ballad', 'ambient', 'downtempo'],
    medium: ['moderate', 'mid-tempo'],
    fast: ['fast', 'upbeat', 'dance', 'techno'],
    'very-fast': ['very fast', 'hardcore', 'speed', 'thrash'],
  };

  return {
    genres: answers.genres,
    decade: answers.decade === 'any' ? null : decadeMap[answers.decade],
    mood: moodMap[answers.mood] || [],
    tempo: tempoMap[answers.tempo] || [],
    format: answers.format,
  };
}

/**
 * Check if a release matches format preference
 */
function matchesFormat(item: CollectionItem, format: 'album' | 'single' | 'both'): boolean {
  if (format === 'both') return true;

  const formats = item.basic_information.formats.map((f) => f.name.toLowerCase());
  const isSingle = formats.some((f) => f.includes('single') || f.includes('7"'));
  const isAlbum = formats.some((f) => f.includes('album') || f.includes('lp') || f.includes('12"'));

  if (format === 'single') return isSingle;
  if (format === 'album') return isAlbum || !isSingle; // Default to album if unclear

  return true;
}

/**
 * Check if a release matches genre
 */
function matchesGenre(item: CollectionItem, genres: string[]): boolean {
  if (genres.length === 0) return true;

  const itemGenres = [
    ...(item.basic_information.genres || []),
    ...(item.basic_information.styles || []),
  ].map((g) => g.toLowerCase());

  return genres.some((genre) =>
    itemGenres.some((itemGenre) => itemGenre.includes(genre.toLowerCase()))
  );
}

/**
 * Check if a release matches decade
 */
function matchesDecade(item: CollectionItem, decade: { min: number; max: number } | null): boolean {
  if (!decade) return true;
  const year = item.basic_information.year || 0;
  return year >= decade.min && year <= decade.max;
}

/**
 * Check if a release matches mood/tempo keywords
 */
function matchesMoodTempo(
  item: CollectionItem,
  moodKeywords: string[],
  tempoKeywords: string[]
): boolean {
  const allKeywords = [...moodKeywords, ...tempoKeywords];
  if (allKeywords.length === 0) return true;

  const itemText = [
    ...(item.basic_information.genres || []),
    ...(item.basic_information.styles || []),
    item.basic_information.title,
  ]
    .join(' ')
    .toLowerCase();

  return allKeywords.some((keyword) => itemText.includes(keyword.toLowerCase()));
}

/**
 * Calculate match score for a collection item
 */
function calculateMatchScore(
  item: CollectionItem,
  criteria: FilterCriteria,
  releaseData?: ReleaseData
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Genre match (30 points)
  if (matchesGenre(item, criteria.genres)) {
    score += 30;
    reasons.push('matches your preferred genres');
  }

  // Decade match (25 points)
  if (matchesDecade(item, criteria.decade)) {
    score += 25;
    if (criteria.decade) {
      reasons.push(`from your preferred decade (${criteria.decade.min}s)`);
    }
  }

  // Mood/tempo match (25 points)
  if (matchesMoodTempo(item, criteria.mood, criteria.tempo)) {
    score += 25;
    reasons.push('matches your mood and tempo preferences');
  }

  // Format match (10 points)
  if (matchesFormat(item, criteria.format)) {
    score += 10;
    reasons.push(`matches your format preference (${criteria.format})`);
  }

  // Rating bonus (10 points if rated)
  if (item.rating > 0) {
    score += 10;
    reasons.push('you have rated this release');
  }

  // Recency bonus (up to 10 points for recently added)
  if (item.date_added) {
    const addedDate = new Date(item.date_added);
    const daysSinceAdded = (Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAdded < 30) {
      score += 10;
      reasons.push('recently added to your collection');
    } else if (daysSinceAdded < 90) {
      score += 5;
    }
  }

  return { score, reasons };
}

/**
 * Filter collection based on quiz answers
 */
export function filterCollection(
  collection: CollectionItem[],
  answers: QuizAnswers
): CollectionItem[] {
  const criteria = quizToFilterCriteria(answers);

  return collection.filter((item) => {
    // Must match format
    if (!matchesFormat(item, criteria.format)) return false;

    // Must match at least one: genre, decade, or mood/tempo
    const matchesGenreFilter = matchesGenre(item, criteria.genres);
    const matchesDecadeFilter = matchesDecade(item, criteria.decade);
    const matchesMoodTempoFilter = matchesMoodTempo(item, criteria.mood, criteria.tempo);

    return matchesGenreFilter || matchesDecadeFilter || matchesMoodTempoFilter;
  });
}

/**
 * Broaden filters if no matches found
 */
export function broadenFilters(
  collection: CollectionItem[],
  answers: QuizAnswers
): CollectionItem[] {
  // First, try removing format requirement
  const noFormatAnswers = { ...answers, format: 'both' as const };
  let filtered = filterCollection(collection, noFormatAnswers);

  // If still no matches, try removing decade requirement
  if (filtered.length === 0) {
    const noDecadeAnswers = { ...noFormatAnswers, decade: 'any' as const };
    filtered = filterCollection(collection, noDecadeAnswers);
  }

  // If still no matches, try removing genre requirement
  if (filtered.length === 0) {
    const noGenreAnswers = { ...noDecadeAnswers, genres: [] };
    filtered = filterCollection(collection, noGenreAnswers);
  }

  return filtered;
}

/**
 * Rank and recommend albums from collection
 */
export function recommendAlbum(
  collection: CollectionItem[],
  answers: QuizAnswers,
  releaseDataMap?: Map<number, ReleaseData>
): Recommendation | null {
  if (collection.length === 0) {
    return null;
  }

  const criteria = quizToFilterCriteria(answers);

  // Calculate scores for all items
  const scoredItems = collection.map((item) => {
    const releaseData = releaseDataMap?.get(item.basic_information.id);
    const { score, reasons } = calculateMatchScore(item, criteria, releaseData);
    return { item, score, reasons, releaseData };
  });

  // Sort by score (descending), then by rating, then by recency
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.item.rating !== a.item.rating) return b.item.rating - a.item.rating;

    const dateA = a.item.date_added ? new Date(a.item.date_added).getTime() : 0;
    const dateB = b.item.date_added ? new Date(b.item.date_added).getTime() : 0;
    return dateB - dateA;
  });

  const topScore = scoredItems[0]?.score ?? 0;
  if (topScore === 0) {
    return null;
  }

  // If multiple items have scores very close to the top score (within 5 points), randomly select from them
  const SCORE_THRESHOLD = 5;
  const closeMatches = scoredItems.filter((item) => topScore - item.score <= SCORE_THRESHOLD);
  
  // Randomly select from close matches if there are multiple
  const selectedMatch = closeMatches.length > 1
    ? closeMatches[Math.floor(Math.random() * closeMatches.length)]
    : scoredItems[0];
  
  if (!selectedMatch) return null;

  // If we don't have release data, create a minimal one
  const releaseData: ReleaseData = selectedMatch.releaseData || {
    id: selectedMatch.item.basic_information.id,
    title: selectedMatch.item.basic_information.title,
    artists: selectedMatch.item.basic_information.artists.map((a) => ({
      name: a.name,
      id: a.id,
    })),
    year: selectedMatch.item.basic_information.year,
    genres: selectedMatch.item.basic_information.genres,
    styles: selectedMatch.item.basic_information.styles,
    tracklist: [],
    images: selectedMatch.item.basic_information.cover_image
      ? [{ type: 'primary', uri: selectedMatch.item.basic_information.cover_image, resource_url: selectedMatch.item.basic_information.cover_image, uri150: selectedMatch.item.basic_information.thumb, width: 500, height: 500 }]
      : [],
    formats: selectedMatch.item.basic_information.formats,
    labels: selectedMatch.item.basic_information.labels,
  };

  return {
    collectionItem: selectedMatch.item,
    releaseData,
    matchScore: selectedMatch.score,
    reasons: selectedMatch.reasons,
  };
}

