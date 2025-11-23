import { useEffect, useState, useRef } from 'react';
import { fetchImageDimensions, ImageDimension } from '../helpers/api/lexicon';

export function useImageDimensions(urls: string[]) {
  const [dimensions, setDimensions] = useState<Record<string, ImageDimension>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  // 1. THE FIX: "Memory" of what we already asked for
  const processedUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    // 2. FILTER: Only ask for URLs we haven't asked for yet
    const newUrlsToFetch = urls.filter((url) => {
      if (!url) return false;
      if (url.includes('/emoji/')) return false; // Don't ask for emojis
      if (url.endsWith('.svg')) return false;
      return !processedUrls.current.has(url);
    });

    if (newUrlsToFetch.length === 0) return;

    const loadDimensions = async () => {
      setLoading(true);

      // Mark these as "processing" so we don't ask again
      newUrlsToFetch.forEach((u) => processedUrls.current.add(u));

      try {
        // 3. API CALL
        const data = await fetchImageDimensions(newUrlsToFetch);

        if (isMounted) {
          // Merge new data with old data
          setDimensions((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.warn('[useImageDimensions] Failed to fetch:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // 4. DEBOUNCE: Wait 200ms before firing to group rapid requests
    const timeoutId = setTimeout(loadDimensions, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [JSON.stringify(urls)]); // Only run if the list of URLs changes

  return { dimensions, loading };
}
