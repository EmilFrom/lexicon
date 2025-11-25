import { ApolloProvider } from '@apollo/client';
import React, { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { client } from './api/client';
import { RequestError, Toast } from './components';
import ErrorBoundary from './components/ErrorBoundary';
import { FORM_DEFAULT_VALUES } from './constants';
import { StorageProvider, imageCacheManager } from './helpers';
import AppNavigator from './navigation/AppNavigator';
import { AppearanceProvider, ThemeProvider } from './theme';
import { NewPostForm } from './types';
import {
  DeviceProvider,
  ModalProvider,
  OngoingLikedTopicProvider,
  PushNotificationsProvider,
  RedirectProvider,
} from './utils';
import { AuthProvider } from './utils/AuthProvider';
import { useApolloClientDevTools } from '@dev-plugins/apollo-client';

if (__DEV__) {
  void import('react-native-console-time-polyfill');
  void import('../reactotronConfig.js');

  // --- START OF CHANGES ---
  // Override console.warn to suppress specific Apollo warnings in the terminal
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args[0];
    // Check if the warning starts with the Apollo error prefix
    if (typeof msg === 'string' && msg.includes('https://go.apollo.dev/c/err#%7B%22version%22%3A%223.14.0%22%2C%22message%22%3A104%2C%22args%22%3A%5B%22cache.diff%22%2C%22canonizeResults%22%2C%22Please%20remove%20this%20option.%22%5D%7D')) {
      return; // Silently ignore this warning
    }
    // Otherwise, pass it through to the original handler
    originalWarn(...args);
  };
  // --- END OF CHANGES ---

  // Based on react-native-reanimated documentation about warning https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#reduced-motion-setting-is-enabled-on-this-device
  LogBox.ignoreLogs([
    '[Reanimated] Reduced motion setting is enabled on this device.',
    'An error occurred in a responseTransformer:',
    'An error occurred! For more details,',
  ]);
}

export default function App() {
  // Fix: Hooks must be called at the top level, not inside conditionals.
  // We pass the client conditionally to the hook instead.
  const devToolsClient = __DEV__ ? client : undefined;
  // @ts-ignore - Library types might enforce client presence, but runtime handles undefined/null in prod
  useApolloClientDevTools(devToolsClient);

  const newPostMethods = useForm<NewPostForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: FORM_DEFAULT_VALUES,
  });

  // Clean up expired image cache on app startup
  useEffect(() => {
    const cleanupCache = async () => {
      try {
        const deletedCount = await imageCacheManager.clearExpiredCache();
        if (__DEV__ && deletedCount > 0) {
          console.log(
            `[ImageCache] Cleaned up ${deletedCount} expired images on startup`,
          );
        }
      } catch (error) {
        console.warn('[ImageCache] Failed to cleanup on startup:', error);
      }
    };
    cleanupCache();
  }, []);

  /**
   * Error Boundary is inside the ThemeProvider because we need to use the core UI, which relies on the theme provided by the ThemeProvider.
   */

  return (
    <ApolloProvider client={client}>
      <DeviceProvider>
        <StorageProvider>
          <PushNotificationsProvider>
            <SafeAreaProvider>
              <AppearanceProvider>
                <ThemeProvider>
                  <ErrorBoundary>
                    <>
                      <OngoingLikedTopicProvider>
                        <ModalProvider>
                          <RedirectProvider>
                            <RequestError>
                              <AuthProvider>
                                <FormProvider {...newPostMethods}>
                                  <AppNavigator />
                                </FormProvider>
                              </AuthProvider>
                            </RequestError>
                          </RedirectProvider>
                        </ModalProvider>
                      </OngoingLikedTopicProvider>
                      <Toast />
                    </>
                  </ErrorBoundary>
                </ThemeProvider>
              </AppearanceProvider>
            </SafeAreaProvider>
          </PushNotificationsProvider>
        </StorageProvider>
      </DeviceProvider>
    </ApolloProvider>
  );
}