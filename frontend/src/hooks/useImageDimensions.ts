import { useEffect, useState, useRef } from 'react';
import { fetchImageDimensions, ImageDimension } from '../helpers/api/lexicon';

// --- FIX START ---
// Move cache outside the hook to share state across all components (Global Cache)
const globalDimensionsCache: Record<string, ImageDimension> = {};
const globalProcessedUrls = new Set<string>();
// --- FIX END ---


export function useImageDimensions(urls: string[]) {
  const [dimensions, setDimensions] = useState<Record<string, ImageDimension>>(
    globalDimensionsCache, // Initialize with what we already know
  );
  const [loading, setLoading] = useState(false);

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
        // On error, remove from processed so we can try again later? 
        // For now, leave them to avoid infinite error loops on 429s.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // 2. Debounce: 
    // Even with global caching, multiple components mounting at the exact same ms 
    // might slip through. A slightly longer debounce helps batch them.
    const timeoutId = setTimeout(loadDimensions, 500); 

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [JSON.stringify(urls)]); 

  return { dimensions, loading };
}