import { discourseHost } from '../../constants';

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
    
    const response = await fetch(`${discourseHost}/lexicon/image-dimensions?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers if the endpoint requires them, 
        // though usually cookies/session handle this for the app.
      },
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