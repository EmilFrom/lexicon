import {
  gql,
  useApolloClient,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useCallback } from 'react';
import { useReactiveVar } from '@apollo/client';

import { tokenVar } from '../../../reactiveVars';
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

const GET_ALL_NOTIFICATION_PREFERENCES = gql`
  query getAllNotificationPreferences {
    chatChannelNotificationPreferences
      @rest(
        type: "[ChatChannelNotificationPreference]"
        path: "/lexicon/chat-notifications"
        method: "GET"
        endpoint: "v1"
      ) {
      preferences @type(name: "[ChatChannelNotificationPreference]") {
        channelId
        pushEnabled
      }
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

export function useGetAllChatChannelNotificationPreferences() {
  const client = useApolloClient();
  const token = useReactiveVar(tokenVar);
  useQuery<Pick<Query, 'chatChannelNotificationPreferences'>>(
    GET_ALL_NOTIFICATION_PREFERENCES,
    {
      skip: !token, // Don't run this query if the user is not logged in
      onCompleted: (queryData) => {
        queryData?.chatChannelNotificationPreferences?.preferences?.forEach(
          (preference) => {
            client.cache.writeQuery({
              query: GET_NOTIFICATION_PREFERENCE,
              variables: { channelId: preference.channelId },
              data: {
                chatChannelNotificationPreference: {
                  __typename: 'ChatChannelNotificationPreference',
                  ...preference,
                },
              },
            });
          },
        );
      },
    },
  );
}

export function useGetChatChannelNotificationPreference(channelId: number) {
  const { data, ...rest } = useQuery<
    Pick<Query, 'chatChannelNotificationPreference'>
  >(GET_NOTIFICATION_PREFERENCE, {
    variables: { channelId },
    skip: !channelId,
    fetchPolicy: 'cache-first',
  });

  return {
    preference: data?.chatChannelNotificationPreference,
    ...rest,
  };
}

export function useUpdateChatChannelNotificationPreference() {
  const [mutate, { loading, error, ...rest }] = useMutation<
    Pick<Mutation, 'updateChatChannelNotificationPreference'>
  >(UPDATE_NOTIFICATION_PREFERENCE);

  const updatePreference = useCallback(
    (channelId: number, pushEnabled: boolean) => {
      return mutate({
        variables: {
          channelId,
          pushEnabled,
          input: { push_enabled: pushEnabled },
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

  return { updatePreference, loading, error, ...rest };
}
