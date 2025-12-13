import { QueryHookOptions } from '@apollo/client';

import {
  ProfileDocument,
  ProfileQueryVariables,
  ProfileQuery as ProfileType,
} from '../../../generatedAPI/server';
import { useStorage } from '../../../helpers';
import { useQuery } from '../../../utils';
import { ErrorAlertOptionType } from '../../../types';

export function useUserGroups(
  options?: QueryHookOptions<ProfileType, ProfileQueryVariables>,
  errorAlert: ErrorAlertOptionType = 'HIDE_ALERT',
) {
  const storage = useStorage();
  const username = storage.getItem('user')?.username || '';

  const { data, loading, error, refetch } = useQuery<
    ProfileType,
    ProfileQueryVariables
  >(
    ProfileDocument,
    {
      ...options,
      variables: { username },
      skip: !username,
    },
    errorAlert,
  );

  const groups = data?.profile?.user?.groups || [];

  return {
    groups,
    loading,
    error,
    refetch,
  };
}

