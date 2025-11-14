import { makeVar, useReactiveVar } from '@apollo/client';
import { getNetworkStateAsync } from 'expo-network';
import React, { useEffect } from 'react';
import Toast, { ToastShowParams } from 'react-native-toast-message';

import { navigate, navigationRef } from '../navigation/NavigationService';

type Props = {
  children?: JSX.Element;
};

export type NetworkStatus = 'Online' | 'NoConnection' | 'DiscourseUnreachable';
export type WithRequestFailed<T extends string> = T | 'REQUEST_FAILED';

export const networkStatusVar = makeVar<NetworkStatus>('Online');
export const requestFailedVar = makeVar<boolean>(false);

const toastContents: Record<
  WithRequestFailed<NetworkStatus>,
  ToastShowParams
> = {
  NoConnection: {
    type: 'noConnectionToast',
    text1: 'No internet connection',
    visibilityTime: 5000,
  },
  DiscourseUnreachable: {
    type: 'unreachableToast',
    text1: 'Discourse unreachable',
    visibilityTime: 5000,
  },
  Online: {
    type: 'onlineToast',
    text1: `You're back online`,
    visibilityTime: 5000,
  },
  REQUEST_FAILED: {
    type: 'requestFailedToast',
    text1: 'Request failed',
    visibilityTime: 5000,
  },
};
let networkCheckIntervalId: NodeJS.Timer | undefined;
let shouldShowNetworkOnline = false;

export function RequestError(props: Props) {
  const { children } = props;

  const networkStatus = useReactiveVar(networkStatusVar);
  const requestFailed = useReactiveVar(requestFailedVar);

  // check network status on no connection periodically
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    if (networkStatus === 'NoConnection' && !networkCheckIntervalId) {
      networkCheckIntervalId = setInterval(async () => {
        const { isInternetReachable } = await getNetworkStateAsync();
        if (isInternetReachable) {
          clearInterval(networkCheckIntervalId);
          networkCheckIntervalId = undefined;
          networkStatusVar('Online');
        }
      }, 5000); // needed as RN and node timer global conflicting https://github.com/microsoft/TypeScript/issues/37053
    }
    return () => {
      if (networkCheckIntervalId) {
        clearInterval(networkCheckIntervalId);
        networkCheckIntervalId = undefined;
      }
    };
  }, [networkStatus]);

  // show toast on network status change
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    if (networkStatus !== 'Online') {
      shouldShowNetworkOnline = true;
      // Copy the current value of `networkStatus` since it could change before the user taps "More Info".
      const currentNetworkStatus = networkStatus;
      return Toast.show({
        ...toastContents[networkStatus],
        props: {
          onMoreInfoPress: () => {
            Toast.hide();
            navigate(['Troubleshoot', { type: currentNetworkStatus }]);
          },
        },
      });
    }
    if (shouldShowNetworkOnline) {
      shouldShowNetworkOnline = false;
      return Toast.show(toastContents[networkStatus]);
    }
  }, [networkStatus]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    if (requestFailed === true) {
      Toast.show({
        ...toastContents.REQUEST_FAILED,
        onHide: () => {
          requestFailedVar(false);
        },
        props: {
          onMoreInfoPress: () => {
            if (navigationRef.isReady()) {
              Toast.hide();
              navigationRef.navigate('Troubleshoot', {
                type: 'REQUEST_FAILED',
              });
            }
          },
        },
      });
    }
  }, [requestFailed]);

  return <>{children}</>;
}
