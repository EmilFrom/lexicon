// --- FIX START ---
import { LazyQueryHookOptions, useLazyQuery, LazyQueryHookExecOptions } from '@apollo/client';
// --- FIX END ---

import {
  GetThreadDetailDocument,
  GetThreadDetailQuery as GetThreadDetailType,
  GetThreadDetailQueryVariables as GetThreadDetailVariable,
} from '../../../generatedAPI/server';

export function useLazyGetThreadDetail(
  options?: LazyQueryHookOptions<GetThreadDetailType, GetThreadDetailVariable>,
) {
  // --- FIX START ---
  // Remove context from initialization
  const [getThreadDetailFunc, { ...other }] = useLazyQuery<
    GetThreadDetailType,
    GetThreadDetailVariable
  >(GetThreadDetailDocument, {
    ...options,
  });

  // Wrapper to inject context
   // --- FIX START ---
  // Wrap function to pass context correctly and avoid TS namespace error
  const getThreadDetail = (
    executeOptions?: LazyQueryHookExecOptions<
      GetThreadDetailType,
      GetThreadDetailVariable
    >,
  ) => {
    return getThreadDetailFunc({
      ...executeOptions,
      context: { queryDeduplication: true, ...executeOptions?.context },
    });
  };
  // --- FIX END ---


  return {
    getThreadDetail,
    ...other,
  };
  // --- FIX END ---
}
