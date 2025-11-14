import { useEffect, useState } from 'react';

import { Post } from '../types';

import mock from './mockData';

export function useMockPostQuery(delay = 1000, simulateError = false) {
  const [data, setData] = useState<Array<Post> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const id = setTimeout(() => {
      if (!isMounted) {
        return;
      }

      if (simulateError) {
        setError(t('Something unexpected happened'));
        setData(null);
      } else {
        setError('');
        setData(mock.posts);
      }
      setLoading(false);
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(id);
      // Reset to loading state so consumers know a fresh mock request is pending.
      setLoading(true);
    };
  }, [simulateError, delay]);

  return { data, error, loading };
}
