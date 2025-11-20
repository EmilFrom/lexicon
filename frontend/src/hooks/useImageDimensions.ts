import { useEffect, useState } from 'react';
import { fetchImageDimensions, ImageDimension } from '../helpers/api/lexicon';

export function useImageDimensions(urls: string[]) {
  const [dimensions, setDimensions] = useState<Record<string, ImageDimension>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDimensions = async () => {
      if (!urls || urls.length === 0) return;
      
      setLoading(true);
      const data = await fetchImageDimensions(urls);
      
      if (isMounted) {
        setDimensions(data);
        setLoading(false);
      }
    };

    loadDimensions();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(urls)]); // Simple array dependency check

  return { dimensions, loading };
}