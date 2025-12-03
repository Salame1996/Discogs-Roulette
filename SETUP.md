# Discogs Quiz App - Setup Guide

## Discogs API Credentials Required

To use this app, you need to obtain OAuth credentials from Discogs:

### Step 1: Create a Discogs Account
1. Go to https://www.discogs.com/users/signup
2. Create a free account if you don't have one

### Step 2: Register Your Application
1. Log in to Discogs
2. Go to https://www.discogs.com/settings/developers
3. Click "Create a new application"
4. Fill in the application details:
   - **Application Name**: Discogs Quiz App (or any name you prefer)
   - **Description**: Music taste quiz app
   - **Website**: (optional, can be your GitHub repo or personal site)
   - **Callback URL**: `discogsquizapp://oauth/callback`
5. Click "Create"
6. Copy your **Consumer Key** and **Consumer Secret**

### Step 3: Configure the App

You have two options to add your credentials:

#### Option A: Environment Variables (Recommended for production)
Create a `.env` file in the root directory:
```
DISCOGS_CONSUMER_KEY=your_consumer_key_here
DISCOGS_CONSUMER_SECRET=your_consumer_secret_here
```

Then update `app.json` to include:
```json
{
  "expo": {
    "extra": {
      "discogsConsumerKey": process.env.DISCOGS_CONSUMER_KEY,
      "discogsConsumerSecret": process.env.DISCOGS_CONSUMER_SECRET
    }
  }
}
```

#### Option B: Direct Configuration (Quick start)
Edit `config/discogs.ts` and replace:
```typescript
export const DISCOGS_CONFIG = {
  consumerKey: 'YOUR_CONSUMER_KEY',  // Replace with your key
  consumerSecret: 'YOUR_CONSUMER_SECRET',  // Replace with your secret
  // ... rest stays the same
};
```

⚠️ **Important**: Never commit your credentials to version control! Add `config/discogs.ts` to `.gitignore` if using Option B.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## How It Works

1. **Quiz Screen**: User answers questions about music preferences (mood, tempo, genres, decade, format)
2. **Authentication**: User authenticates with Discogs OAuth
3. **Collection Fetch**: App fetches user's Discogs collection
4. **Filtering**: Collection is filtered based on quiz answers
5. **Recommendation**: Algorithm scores and ranks albums, recommends the best match
6. **Display**: Shows recommended album with cover art, metadata, tracklist, and explanation

## Features

- ✅ OAuth 1.0a authentication with Discogs
- ✅ Fetches user's complete collection (handles pagination)
- ✅ Smart filtering based on quiz preferences
- ✅ Fallback logic if no exact matches found
- ✅ Scoring algorithm considers:
  - Genre matches
  - Decade preferences
  - Mood/tempo keywords
  - Format preferences
  - User ratings
  - Recency added to collection
- ✅ Beautiful UI with album cover, tracklist, and recommendation explanation

## API Rate Limits

Discogs API has rate limits:
- 60 requests per minute for authenticated requests
- The app includes rate limiting (1.1s delay between release detail fetches)

For large collections, fetching all release details may take time. The app limits detailed fetching to top 10 matches for performance.

## Troubleshooting

### "Not authenticated" error
- Make sure you've completed the OAuth flow
- Check that your Consumer Key and Secret are correct
- Try clearing app data and re-authenticating

### "Empty Collection" error
- Make sure you have releases in your Discogs collection
- Go to https://www.discogs.com/my and add some releases to your collection

### OAuth callback not working
- Verify the callback URL in your Discogs app settings matches: `discogsquizapp://oauth/callback`
- Make sure the URL scheme is configured in `app.json`

### No matches found
- Try selecting more genres or broader preferences
- The app will automatically broaden filters if no exact matches are found

## Project Structure

```
app/
  quiz.tsx              # Music taste quiz screen
  auth.tsx              # Discogs OAuth authentication
  recommendation.tsx    # Displays recommended album
  (tabs)/               # Tab navigation (home screen)
  
services/
  discogsAuth.ts        # OAuth authentication service
  collectionFetcher.ts  # Fetches user collection
  recommendationEngine.ts  # Filtering and scoring logic

config/
  discogs.ts            # API configuration

types/
  index.ts              # TypeScript type definitions
```

## Next Steps

- Add more quiz questions
- Improve recommendation algorithm
- Add ability to save favorites
- Add sharing functionality
- Cache collection data for offline use
- Add more detailed release information

