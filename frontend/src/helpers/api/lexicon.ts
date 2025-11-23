import { discourseHost } from '../../constants';
import { decodeToken } from '../';
import { tokenVar } from '../../reactiveVars';

export type ImageDimension = {
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
};

export type ImageDimensionsResponse = {
  dimensions: Record<string, ImageDimension>;
};

export const fetchImageDimensions = async (
  urls: string[],
): Promise<Record<string, ImageDimension>> => {
  if (!urls || urls.length === 0) return {};

  try {
    // Construct query string manually to ensure correct format for Rails (urls[]=...)
    const queryString = urls
      .map((url) => `urls[]=${encodeURIComponent(url)}`)
      .join('&');

    const token = tokenVar();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = token;
      const apiKey = decodeToken(token);
      if (apiKey) {
        headers['User-Api-Key'] = apiKey;
      }
    }

    const response = await fetch(
      `${discourseHost}/lexicon/image-dimensions?${queryString}`,
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      if (__DEV__) {
        const text = await response.text();
        console.warn(
          `[Lexicon] Failed to fetch dimensions: ${response.status}`,
          text.substring(0, 100),
        );
      }
      return {};
    }

    const data: ImageDimensionsResponse = await response.json();

    // --- FIX: NORMALIZE KEYS ---
    // The server might return URL-encoded keys (e.g., "https%3A%2F%2F...")
    // but our app expects decoded keys (e.g., "https://...").
    // We create a new object where every key is decoded.
    const normalizedDimensions: Record<string, ImageDimension> = {};

    Object.entries(data.dimensions).forEach(([key, value]) => {
      const decodedKey = decodeURIComponent(key);
      normalizedDimensions[decodedKey] = value;
    });

    if (__DEV__) {
      // Debug check
      const missing = urls.filter((u) => !normalizedDimensions[u]);
      if (missing.length > 0) {
        console.warn('[Lexicon] Still missing keys after normalization:', {
          requested: missing[0],
          availableSample: Object.keys(normalizedDimensions)[0],
        });
      }
    }

    return normalizedDimensions;
    // --- END FIX ---
  } catch (error) {
    console.warn('[Lexicon] Error fetching image dimensions:', error);
    return {};
  }
};
