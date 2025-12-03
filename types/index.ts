// Quiz answer types
export interface QuizAnswers {
  mood: 'energetic' | 'relaxed' | 'melancholic' | 'happy' | 'aggressive' | 'peaceful';
  tempo: 'slow' | 'medium' | 'fast' | 'very-fast';
  genres: string[]; // Multiple selection
  decade: '1960s' | '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s' | 'any';
  format: 'album' | 'single' | 'both';
  language: 'english' | 'spanish' | 'french' | 'german' | 'italian' | 'portuguese' | 'japanese' | 'korean' | 'chinese' | 'all';
}

// Discogs collection item
export interface CollectionItem {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: {
    id: number;
    master_id: number | null;
    master_url: string | null;
    resource_url: string;
    thumb: string;
    cover_image: string;
    title: string;
    year: number;
    formats: Array<{
      name: string;
      qty: string;
      descriptions?: string[];
    }>;
    labels: Array<{
      name: string;
      catno: string;
    }>;
    artists: Array<{
      name: string;
      anv: string;
      join: string;
      role: string;
      tracks: string;
      id: number;
      resource_url: string;
    }>;
    genres: string[];
    styles: string[];
  };
}

// Full release data from Discogs
export interface ReleaseData {
  id: number;
  title: string;
  artists: Array<{
    name: string;
    id: number;
  }>;
  year: number;
  genres: string[];
  styles: string[];
  tracklist: Array<{
    position: string;
    title: string;
    duration: string;
    type_: string;
  }>;
  images: Array<{
    type: string;
    uri: string;
    resource_url: string;
    uri150: string;
    width: number;
    height: number;
  }>;
  formats: Array<{
    name: string;
    qty: string;
    descriptions?: string[];
  }>;
  labels: Array<{
    name: string;
    catno: string;
  }>;
  notes?: string;
}

// Recommendation result
export interface Recommendation {
  collectionItem: CollectionItem;
  releaseData: ReleaseData;
  matchScore: number;
  reasons: string[];
}

