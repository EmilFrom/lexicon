import {

  DocumentNode,
  LazyQueryHookOptions,
  OperationVariables,
  QueryTuple,
  useLazyQuery as useLazyQueryBase,
} from '@apollo/client';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react'; // Import useEffect


import { errorHandlerAlert } from '../helpers';
import { ErrorAlertOptionType } from '../types';

// --- FIX START ---
// Added constraint: TVariables extends OperationVariables
export function useLazyQuery<TData, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode,
  options?: LazyQueryHookOptions<TData, TVariables> & {
    pollingEnabled?: boolean;
  },
  errorAlert: ErrorAlertOptionType = 'SHOW_ALERT',
): QueryTuple<TData, TVariables> {
  // --- FIX END ---

  const isFocused = useIsFocused();



  // Destructure variables and onError to avoid passing them to initialization
  const {
    fetchPolicy = 'cache-and-network',
    pollingEnabled = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    variables: _variables,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onError: _onError,
    ...others
  } = options ?? {};

  const {
    nextFetchPolicy = fetchPolicy === 'cache-and-network'
      ? 'cache-first'
      : undefined,
    notifyOnNetworkStatusChange = fetchPolicy === 'network-only',
    pollInterval = pollingEnabled && isFocused ? 5000 : 0,
    ...otherOptions
  } = others;

  const [queryFunction, queryResult] = useLazyQueryBase<TData, TVariables>(
    query,
    {
      fetchPolicy,
      nextFetchPolicy,
      notifyOnNetworkStatusChange,
      pollInterval,
      // onError and variables are removed here
      ...otherOptions,
    },
  );

  // Handle global error alert side-effect
  useEffect(() => {
    if (queryResult.error && errorAlert === 'SHOW_ALERT') {
      errorHandlerAlert(queryResult.error);
    }
  }, [queryResult.error, errorAlert]);

  return [queryFunction, queryResult];
}