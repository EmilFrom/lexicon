import {
  ApolloError,
  DocumentNode,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  useQuery as useQueryBase,
} from '@apollo/client';

import { useEffect } from 'react'; // Import useEffect

import { errorHandlerAlert } from '../helpers';
import { ErrorAlertOptionType } from '../types';

// --- FIX START ---
// Added constraint: TVariables extends OperationVariables
export function useQuery<TData, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>,
  errorAlert: ErrorAlertOptionType = 'SHOW_ALERT',
): QueryResult<TData, TVariables> {
// --- FIX END ---
  const onErrorDefault = (error: ApolloError) => {
    errorHandlerAlert(error);
  };
  

  // Destructure onError and onCompleted to prevent passing them to useQueryBase
  const {
    fetchPolicy = 'cache-and-network',
    onError: _onError,
    onCompleted: _onCompleted,
    ...others
  } = options ?? {};

  const {
    nextFetchPolicy = fetchPolicy === 'cache-and-network'
      ? 'cache-first'
      : undefined,
    notifyOnNetworkStatusChange = fetchPolicy === 'network-only',
    ...otherOptions
  } = others;

  const queryResult = useQueryBase<TData, TVariables>(query, {
    fetchPolicy,
    nextFetchPolicy,
    notifyOnNetworkStatusChange,
    ...otherOptions,
  });

  useEffect(() => {
    if (queryResult.error && errorAlert === 'SHOW_ALERT') {
      errorHandlerAlert(queryResult.error);
    }
  }, [queryResult.error, errorAlert]);

  return queryResult;
}