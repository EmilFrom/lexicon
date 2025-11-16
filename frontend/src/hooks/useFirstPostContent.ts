import { useFragment_experimental, OperationVariables } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';

import {
  TopicDetailFragmentDoc,
  TopicDetailOutput,
} from '../generatedAPI/server';

import { useTopicDetail } from './rest/post/useTopicDetail';

type UseFirstPostContentResult = {
  content: string | null;
  loading: boolean;
};

/**
 * Hook to fetch and extract the first post's content for a topic.
 * 
 * Strategy:
 * 1. Check Apollo cache for existing topicDetail data
 * 2. If cached, extract markdownContent immediately
 * 3. If not cached, trigger lazy fetch of /t/{topicId}.json
 * 4. Return stable content to prevent flickering
 */
export function useFirstPostContent(
  topicId: number,
): UseFirstPostContentResult {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [stableContent, setStableContent] = useState<string | null>(null);

  // Try to read from cache first
  const cacheResult = useFragment_experimental<
    TopicDetailOutput,
    OperationVariables
  >({
    fragment: TopicDetailFragmentDoc,
    fragmentName: 'TopicDetailFragment',
    from: {
      __typename: 'TopicDetailOutput',
      id: topicId,
    },
  });

  // If we have cached data, extract the first post content (memoized)
  // Try firstPost first (when includeFirstPost=true), then fall back to posts[0]
  const cachedContent = useMemo(() => {
    if (!cacheResult.complete) return null;
    return (
      cacheResult.data?.postStream?.firstPost?.markdownContent ||
      cacheResult.data?.postStream?.posts?.[0]?.markdownContent ||
      null
    );
  }, [cacheResult.complete, cacheResult.data]);

  // Only fetch if not in cache and we haven't already started fetching
  const { data, loading } = useTopicDetail(
    {
      variables: {
        topicId,
        includeFirstPost: true,
      },
      skip: !shouldFetch || cacheResult.complete,
      fetchPolicy: 'cache-first',
    },
    'HIDE_ALERT',
  );

  // Trigger fetch if cache miss
  useEffect(() => {
    if (!cacheResult.complete && !shouldFetch) {
      setShouldFetch(true);
    }
  }, [cacheResult.complete, shouldFetch]);

  // Extract content from fetched data (memoized)
  // Try firstPost first (when includeFirstPost=true), then fall back to posts[0]
  const fetchedContent = useMemo(() => {
    if (!data?.topicDetail) return null;
    return (
      data.topicDetail.postStream?.firstPost?.markdownContent ||
      data.topicDetail.postStream?.posts?.[0]?.markdownContent ||
      null
    );
  }, [data]);

  // Update stable content only when we have new content
  // This prevents flickering by keeping the previous content until new content is ready
  useEffect(() => {
    const newContent = cachedContent || fetchedContent;
    if (newContent && newContent !== stableContent) {
      setStableContent(newContent);
    }
  }, [cachedContent, fetchedContent, stableContent]);

  return {
    content: stableContent,
    loading: !cacheResult.complete && loading,
  };
}

