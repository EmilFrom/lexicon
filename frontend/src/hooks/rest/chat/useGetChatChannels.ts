import { LazyQueryHookOptions } from '@apollo/client';

import { getChatChannelsPathBuilder } from '../../../api/pathBuilder';
import {
  GetChatChannelsDocument,
  GetChatChannelsQuery as GetChatChannelsType,
  GetChatChannelsQueryVariables as GetChatChannelsVariables,
} from '../../../generatedAPI/server';
import { useLazyQuery } from '../../../utils';

export function useLazyGetChatChannels(
  options?: LazyQueryHookOptions<GetChatChannelsType, GetChatChannelsVariables>,
) {
  // --- FIX START ---
  // Remove context from here
  const [
    getChatChannelsMutateFunc,
    { data, loading, error, refetch, fetchMore },
  ] = useLazyQuery<GetChatChannelsType, GetChatChannelsVariables>(
    GetChatChannelsDocument,
    {
      pollingEnabled: true,
      ...options,
    },
  );

  const getChatChannels = (args: { variables: GetChatChannelsVariables }) => {
    return getChatChannelsMutateFunc({
      ...args,
      variables: {
        ...args.variables,
        getChatChannelsPath: getChatChannelsPathBuilder,
      },
      // Pass context here instead
      context: { queryDeduplication: true },
    });
  };
  // --- FIX END ---

  return { getChatChannels, loading, error, refetch, fetchMore, data };
}
