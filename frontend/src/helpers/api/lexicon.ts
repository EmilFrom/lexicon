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

export const fetchImageDimensions = async (urls: string[]): Promise<Record<string, ImageDimension>> => {
  if (!urls || urls.length === 0) return {};

  try {
    // Construct query string manually to ensure correct format for Rails (urls[]=...)
    const queryString = urls
      .map((url) => `urls[]=${encodeURIComponent(url)}`)
      .join('&');

      const token = tokenVar();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = token;
      
      // decodeToken extracts the "User-Api-Key" needed by Discourse
      const apiKey = decodeToken(token);
      if (apiKey) {
        headers['User-Api-Key'] = apiKey;
      }
    }
    
    const response = await fetch(`${discourseHost}/lexicon/image-dimensions?${queryString}`, {
      method: 'GET',
      headers, // <--- This is the fix! We use the variable 'headers' we made earlier.
    });

    if (!response.ok) {
      console.warn('[Lexicon] Failed to fetch image dimensions:', response.status);
      return {};
    }

    const data: ImageDimensionsResponse = await response.json();
    return data.dimensions;
  } catch (error) {
    console.warn('[Lexicon] Error fetching image dimensions:', error);
    return {};
  }
};