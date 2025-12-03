/**
 * Vercel Serverless Function for Discogs OAuth Proxy
 * 
 * This function proxies OAuth requests to Discogs API to avoid CORS issues
 * 
 * To use this:
 * 1. Deploy to Vercel
 * 2. Set environment variables: DISCOGS_CONSUMER_KEY, DISCOGS_CONSUMER_SECRET
 * 3. Update the API_URL in your app to point to this function
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...params } = req.body;

  const DISCOGS_CONSUMER_KEY = process.env.DISCOGS_CONSUMER_KEY;
  const DISCOGS_CONSUMER_SECRET = process.env.DISCOGS_CONSUMER_SECRET;

  if (!DISCOGS_CONSUMER_KEY || !DISCOGS_CONSUMER_SECRET) {
    return res.status(500).json({ error: 'Discogs credentials not configured' });
  }

  try {
    if (action === 'request_token') {
      // Handle request token
      const response = await fetch('https://api.discogs.com/oauth/request_token', {
        method: 'POST',
        headers: {
          'Authorization': params.authHeader,
        },
      });

      const data = await response.text();
      return res.status(200).send(data);
    }

    if (action === 'access_token') {
      // Handle access token exchange
      const response = await fetch('https://api.discogs.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Authorization': params.authHeader,
        },
      });

      const data = await response.text();
      return res.status(200).send(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('OAuth proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}

