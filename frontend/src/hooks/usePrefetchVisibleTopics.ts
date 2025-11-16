import { useEffect, useMemo, useRef } from 'react';

import { useTopicDetail } from './rest/post/useTopicDetail';

type UsePrefetchVisibleTopicsParams = {
  visibleTopicIds: number[];
  enabled?: boolean;
};

/**
 * Hook to prefetch topic details for visible items + 30% buffer.
 * 
 * Strategy:
 * 1. Calculate visible range + 30% buffer
 * 2. Batch-fetch topic details for calculated range
 * 3. Use cache-first policy to avoid redundant requests
 * 4. Debounce to prevent excessive fetching during scroll
 */
export function usePrefetchVisibleTopics({
  visibleTopicIds,
  enabled = true,
}: UsePrefetchVisibleTopicsParams) {
  const prefetchedIds = useRef<Set<number>>(new Set());
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Stabilize the visible IDs array to prevent unnecessary effect runs
  const visibleIdsKey = visibleTopicIds.join(',');

  // Calculate buffer: 30% more topics (memoized to prevent recalculation)
  const topicsToFetch = useMemo(() => {
    const bufferSize = Math.ceil(visibleTopicIds.length * 0.3);
    return visibleTopicIds.slice(0, visibleTopicIds.length + bufferSize);
  }, [visibleIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter out already prefetched topics (memoized)
  const newTopicsToFetch = useMemo(
    () => topicsToFetch.filter((id) => !prefetchedIds.current.has(id)),
    [topicsToFetch],
  );

  // Use lazy query for each topic (Apollo will handle caching)
  const { refetch } = useTopicDetail(
    {
      skip: true, // Don't fetch on mount
      fetchPolicy: 'cache-first',
    },
    'HIDE_ALERT',
  );

  useEffect(() => {
    if (!enabled || newTopicsToFetch.length === 0) {
      return;
    }

    // Debounce prefetch to avoid excessive requests during scroll
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      // Prefetch each topic
      newTopicsToFetch.forEach((topicId) => {
        refetch({
          topicId,
          includeFirstPost: true,
        })
          .then(() => {
            // Only mark as prefetched after successful fetch
            prefetchedIds.current.add(topicId);
          })
          .catch(() => {
            // Silently fail - this is background prefetch
          });
      });
    }, 200); // 200ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [enabled, newTopicsToFetch, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      prefetchedIds.current.clear();
    };
  }, []);
}

