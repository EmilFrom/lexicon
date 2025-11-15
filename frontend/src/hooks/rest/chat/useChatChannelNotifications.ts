import { gql, useMutation, useQuery } from '@apollo/client';
import { useCallback } from 'react';

import { Mutation, Query } from '../../../generatedAPI/server';

const GET_NOTIFICATION_PREFERENCE = gql`
  query getNotificationPreference($channelId: Int!) {
    chatChannelNotificationPreference(channelId: $channelId)
      @rest(
        type: "ChatChannelNotificationPreference"
        path: "/lexicon/chat-notifications/{args.channelId}"
        method: "GET"
      ) {
      userId
      channelId
      pushEnabled
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCE = gql`
  mutation updateNotificationPreference(
    $channelId: Int!
    $pushEnabled: Boolean!
    $input: UpdateNotificationPreferenceInput
  ) {
    updateChatChannelNotificationPreference(
      channelId: $channelId
      input: $input
    )
      @rest(
        type: "ChatChannelNotificationPreference"
        path: "/lexicon/chat-notifications/{args.channelId}"
        method: "PUT"
        bodyKey: "input"
      ) {
      userId
      channelId
      pushEnabled
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
        variables: { 
          channelId, 
          pushEnabled,
          input: { push_enabled: pushEnabled }
        },
        // Optimistically update the cache
        optimisticResponse: {
          updateChatChannelNotificationPreference: {
            __typename: 'ChatChannelNotificationPreference',
            userId: -1, // Placeholder
            channelId: channelId,
            pushEnabled: pushEnabled,
          },
        },
        update: (cache, { data }) => {
          if (!data?.updateChatChannelNotificationPreference) {
            return;
          }
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
