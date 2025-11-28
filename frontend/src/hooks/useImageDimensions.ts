import { useEffect, useState } from 'react';
import { fetchImageDimensions, ImageDimension } from '../helpers/api/lexicon';

// Global Cache
const globalDimensionsCache: Record<string, ImageDimension> = {};
const globalProcessedUrls = new Set<string>();

export function useImageDimensions(urls: string[]) {
  const [dimensions, setDimensions] = useState<Record<string, ImageDimension>>(
    globalDimensionsCache,
  );
  const [loading, setLoading] = useState(false);

  // Stabilize dependency
  const urlsKey = urls.join(',');

  useEffect(() => {
    let isMounted = true;

    // 1. Filter: Only ask for URLs we haven't asked for globally
    const newUrlsToFetch = urls.filter((url) => {
      if (!url) return false;
      if (url.includes('/emoji/')) return false;
      if (url.endsWith('.svg')) return false;

      // Check global sets/objects
      return !globalProcessedUrls.has(url) && !globalDimensionsCache[url];
    });

    // If everything is cached, just ensure local state is up to date
    if (newUrlsToFetch.length === 0) {
      // Optional: Check if we need to sync local state with global cache
      // setDimensions((prev) => ({ ...prev, ...globalDimensionsCache }));
      return;
    }

    const loadDimensions = async () => {
      setLoading(true);

      // Mark these as "processing" immediately to prevent other components from asking
      newUrlsToFetch.forEach((u) => globalProcessedUrls.add(u));

      try {
        const data = await fetchImageDimensions(newUrlsToFetch);

        // Update Global Cache
        Object.assign(globalDimensionsCache, data);

        if (isMounted) {
          // Update Local State
          setDimensions((prev) => ({ ...prev, ...globalDimensionsCache }));
        }
      } catch (e) {
        console.warn('[useImageDimensions] Failed to fetch:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // 2. Debounce
    const timeoutId = setTimeout(loadDimensions, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);

  return { dimensions, loading };
}
