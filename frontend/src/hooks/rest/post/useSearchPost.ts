import { LazyQueryHookOptions } from '@apollo/client';

import { searchPostPathBuilder } from '../../../api/pathBuilder';
import {
  SearchDocument,
  SearchQuery as SearchPostType,
  SearchQueryVariables as SearchPostVariables,
} from '../../../generatedAPI/server';
import { useLazyQuery } from '../../../utils';
import { useCallback } from 'react'; // Import useCallback

export function useSearchPost(
  options?: LazyQueryHookOptions<SearchPostType, SearchPostVariables>,
) {
  const [getPostsLazyFunc, { data, loading, error, refetch, fetchMore }] = useLazyQuery<
    SearchPostType,
    SearchPostVariables
  >(SearchDocument, {
    ...options,
  });

  // --- FIX START: Memoize function ---
  const getPosts = useCallback((args: { variables: SearchPostVariables }) => {
    return getPostsLazyFunc({
      ...args,
      variables: {
        ...args.variables,
        searchPostPath: searchPostPathBuilder,
      },
    });
  }, [getPostsLazyFunc]); // Dependency is the Apollo function (stable)
  // --- FIX END ---


  return { getPosts, data, loading, error, refetch, fetchMore };
}