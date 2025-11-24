import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useCallback } from 'react';
import { useReactiveVar } from '@apollo/client';

import { tokenVar } from '../../../reactiveVars';
import { Mutation, Query } from '../../../generatedAPI/server';

// --- FIX START ---
// Import the output type
import { ChatChannelNotificationsOutput } from '../../../generatedAPI/server';

// Define local response types since these aren't on the main Query type
interface GetNotificationPreferenceData {
  chatChannelNotificationPreference: ChatChannelNotificationsOutput;
}

interface GetAllNotificationPreferencesData {
  chatChannelNotificationPreferences: {
    preferences: ChatChannelNotificationsOutput[];
  };
}

interface UpdateNotificationPreferenceData {
  updateChatChannelNotificationPreference: ChatChannelNotificationsOutput;
}
// --- FIX END ---


// Make sure the query is defined to return 'ChatChannelNotificationsOutput' or equivalent
const GET_NOTIFICATION_PREFERENCE = gql`
  query getNotificationPreference($channelId: Int!) {
    chatChannelNotificationPreference(channelId: $channelId)
      @rest(
        type: "ChatChannelNotificationsOutput" 
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
        type: "[ChatChannelNotificationsOutput]"
        path: "/lexicon/chat-notifications"
        method: "GET"
        endpoint: "v1"
      ) {
      preferences @type(name: "[ChatChannelNotificationsOutput]") {
        userId
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
        type: "ChatChannelNotificationsOutput"
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
  
  // --- FIX START ---
  useQuery<GetAllNotificationPreferencesData>(
    GET_ALL_NOTIFICATION_PREFERENCES,
    {
      skip: !token, 
      onCompleted: (queryData) => {
        queryData?.chatChannelNotificationPreferences?.preferences?.forEach(
          (preference) => {
            client.cache.writeQuery({
              query: GET_NOTIFICATION_PREFERENCE,
              variables: { channelId: preference.channelId },
              data: {
                chatChannelNotificationPreference: {
                  __typename: 'ChatChannelNotificationsOutput',
                  ...preference,
                },
              },
            });
          },
        );
      },
    },
  );
  // --- FIX END ---
}

export function useGetChatChannelNotificationPreference(channelId: number) {
  // --- FIX START ---
  const { data, ...rest } = useQuery<GetNotificationPreferenceData>(GET_NOTIFICATION_PREFERENCE, {
    variables: { channelId },
    skip: !channelId,
    fetchPolicy: 'cache-first',
  });
  // --- FIX END ---

  return {
    preference: data?.chatChannelNotificationPreference,
    ...rest,
  };
}

export function useUpdateChatChannelNotificationPreference() {
  // --- FIX START ---
  const [mutate, { loading, error, ...rest }] = useMutation<UpdateNotificationPreferenceData>(UPDATE_NOTIFICATION_PREFERENCE);
  // --- FIX END ---

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
