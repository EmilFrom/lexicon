import { useFragment, OperationVariables } from '@apollo/client';
import { useMemo } from 'react';

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
 * 4. Return stable content directly to prevent flickering
 */
export function useFirstPostContent(
  topicId: number,
): UseFirstPostContentResult {
  // Try to read from cache first
  const cacheResult = useFragment<TopicDetailOutput, OperationVariables>({
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

  // --- START OF CHANGES ---
  // Determine if we should skip the network request based on cache availability
  const skipQuery = !!cachedContent;

  const { data, loading } = useTopicDetail(
    {
      variables: {
        topicId,
        includeFirstPost: true,
      },
      skip: skipQuery, // Skip if we have content from cache fragment
      fetchPolicy: 'cache-first',
    },
    'HIDE_ALERT',
  );

  // Extract content from fetched data
  const fetchedContent =
    data?.topicDetail?.postStream?.firstPost?.markdownContent ??
    data?.topicDetail?.postStream?.posts?.[0]?.markdownContent ??
    null;

  // Stable content is either what we found in cache fragment OR what we just fetched
  const content = cachedContent ?? fetchedContent;

  return {
    content,
    // We are loading if we don't have content yet AND the query is in progress
    loading: !content && loading,
  };
  // --- END OF CHANGES ---
}
