import { useEffect, useMemo, useRef, useState } from 'react';

import { useTopicDetail } from './rest/post/useTopicDetail';

type UsePrefetchVisibleTopicsParams = {
  visibleTopicIds: number[];
  enabled?: boolean;
};

/**
 * Hook to prefetch topic details for visible items + 30% buffer.
 */
export function usePrefetchVisibleTopics({
  visibleTopicIds,
  enabled = true,
}: UsePrefetchVisibleTopicsParams) {
  const prefetchedIds = useRef<Set<number>>(new Set());
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fix: Use state to hold the filtered list.
  const [topicsToFetch, setTopicsToFetch] = useState<number[]>([]);

  // Calculate buffer: 30% more topics
  // --- FIX: Removed visibleIdsKey as it was causing a linter warning and wasn't strictly necessary given visibleTopicIds is a dep ---
  const potentialCandidates = useMemo(() => {
    const bufferSize = Math.ceil(visibleTopicIds.length * 0.3);
    return visibleTopicIds.slice(0, visibleTopicIds.length + bufferSize);
  }, [visibleTopicIds]);

  // Fix: Filter topics in an effect.
  useEffect(() => {
    const needed = potentialCandidates.filter(
      (id) => !prefetchedIds.current.has(id),
    );
    if (needed.length > 0) {
      setTopicsToFetch(needed);
    }
  }, [potentialCandidates]);

  const { refetch } = useTopicDetail(
    {
      skip: true, // Don't fetch on mount
      fetchPolicy: 'cache-first',
    },
    'HIDE_ALERT',
  );

  useEffect(() => {
    if (!enabled || topicsToFetch.length === 0) {
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      topicsToFetch.forEach((topicId) => {
        refetch({
          topicId,
          includeFirstPost: true,
        })
          .then(() => {
            prefetchedIds.current.add(topicId);
          })
          .catch(() => {
            // Silently fail
          });
      });
    }, 200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [enabled, topicsToFetch, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    // --- FIX: Copy ref value to variable to safely use in cleanup ---
    const idsSet = prefetchedIds.current;
    return () => {
      idsSet.clear();
    };
  }, []);
}