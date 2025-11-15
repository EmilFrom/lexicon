import { gql, useMutation, useQuery } from '@apollo/client';
import { useCallback } from 'react';

import {
  ChatChannelNotificationPreference,
  Mutation,
  Query,
} from '../../generatedAPI/server';

const GET_NOTIFICATION_PREFERENCE = gql`
  query getNotificationPreference($channelId: Int!) {
    chatChannelNotificationPreference(channelId: $channelId)
      @rest(
        type: "ChatChannelNotificationPreference"
        path: "/lexicon/chat-notifications/{args.channelId}"
        method: "GET"
      ) {
      user_id
      channel_id
      push_enabled
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCE = gql`
  mutation updateNotificationPreference(
    $channelId: Int!
    $pushEnabled: Boolean!
  ) {
    updateChatChannelNotificationPreference(
      channelId: $channelId
      pushEnabled: $pushEnabled
    )
      @rest(
        type: "ChatChannelNotificationPreference"
        path: "/lexicon/chat-notifications/{args.channelId}"
        method: "PUT"
      ) {
      user_id
      channel_id
      push_enabled
    }
  }
`;

export function useGetChatChannelNotificationPreference(channelId: number) {
  const { data, ...rest } = useQuery<
    Pick<Query, 'chatChannelNotificationPreference'>
  >(GET_NOTIFICATION_PREFERENCE, {
    variables: { channelId },
    skip: !channelId,
  });

  return {
    preference: data?.chatChannelNotificationPreference,
    ...rest,
  };
}

export function useUpdateChatChannelNotificationPreference() {
  const [mutate, { ...rest }] = useMutation<
    Pick<Mutation, 'updateChatChannelNotificationPreference'>
  >(UPDATE_NOTIFICATION_PREFERENCE);

  const updatePreference = useCallback(
    (channelId: number, pushEnabled: boolean) => {
      return mutate({
        variables: { channelId, pushEnabled },
        // Optimistically update the cache
        optimisticResponse: {
          updateChatChannelNotificationPreference: {
            __typename: 'ChatChannelNotificationPreference',
            user_id: -1, // Placeholder
            channel_id: channelId,
            push_enabled: pushEnabled,
          },
        },
        update: (cache, { data }) => {
          if (!data?.updateChatChannelNotificationPreference) return;
          cache.writeQuery({
            query: GET_NOTIFICATION_PREFERENCE,
            variables: { channelId },
            data: {
              chatChannelNotificationPreference:
                data.updateChatChannelNotificationPreference,
            },
          });
        },
      });
    },
    [mutate],
  );

  return { updatePreference, ...rest };
}
