import { useState, useEffect } from 'react';
import { useReactiveVar } from '@apollo/client';

import { tokenVar } from '../reactiveVars';
import { imageCacheManager } from '../helpers/imageCache';

interface UseAuthenticatedImageOptions {
  maxAge?: number;
  maxSize?: number;
  enabled?: boolean;
  serverDimensions?: { width: number; height: number; aspectRatio?: number };
}

interface UseAuthenticatedImageResult {
  localUri: string | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  dimensions?: { width: number; height: number; aspectRatio?: number };
}

export function useAuthenticatedImage(
  remoteUrl: string | undefined,
  options: UseAuthenticatedImageOptions = {},
): UseAuthenticatedImageResult {
  const { enabled = true, maxAge, maxSize, serverDimensions } = options;
  const token = useReactiveVar(tokenVar);

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dimensions, setDimensions] = useState<
    { width: number; height: number; aspectRatio?: number } | undefined
  >(serverDimensions);

  useEffect(() => {
    if (__DEV__) {
      console.log('[useAuthenticatedImage] Effect triggered:', {
        url: remoteUrl,
        enabled,
        hasToken: !!token,
        currentLocalUri: localUri,
        hasServerDimensions: !!serverDimensions,
      });
    }

    // If server dimensions are provided and we don't have dimensions yet, use them
    if (serverDimensions && !dimensions) {
      setDimensions(serverDimensions);
    }

    if (!remoteUrl || !enabled) {
      if (__DEV__) {
        console.log('[useAuthenticatedImage] Skipping - no URL or disabled');
      }
      setLocalUri(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      try {
        setError(null);

        if (__DEV__) {
          console.log('[useAuthenticatedImage] Loading:', {
            url: remoteUrl,
            hasToken: !!token,
            tokenLength: token?.length,
          });
        }

        // Check cache first
        const cachedUri = await imageCacheManager.getCachedImage(remoteUrl, {
          maxAge,
          maxSize,
        });

        if (cachedUri && !cancelled) {
          if (__DEV__) {
            console.log('[useAuthenticatedImage] Using cached:', cachedUri);
          }
          // Get cached dimensions (only if we don't have server dimensions)
          if (!serverDimensions) {
            const cachedDimensions =
              await imageCacheManager.getCachedImageDimensions(remoteUrl);
            setDimensions(cachedDimensions);
          }
          setLocalUri(cachedUri);
          setIsLoading(false);
          return;
        }

        // Download and cache if not in cache
        if (!token) {
          throw new Error('No authentication token available');
        }

        const downloadedUri = await imageCacheManager.downloadAndCacheImage(
          remoteUrl,
          token,
          { maxAge, maxSize },
        );

        if (!cancelled) {
          // Get dimensions after download (only if we don't have server dimensions)
          if (!serverDimensions) {
            const downloadedDimensions =
              await imageCacheManager.getCachedImageDimensions(remoteUrl);
            setDimensions(downloadedDimensions);
          }
          setLocalUri(downloadedUri);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load image';
          console.error('[useAuthenticatedImage] Error:', {
            url: remoteUrl,
            error: errorMessage,
            errorDetails: err,
          });
          setError(
            err instanceof Error ? err : new Error('Failed to load image'),
          );
          setIsLoading(false);
          setLocalUri(null);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [remoteUrl, token, enabled, maxAge, maxSize, retryCount, serverDimensions]);

  const retry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return {
    localUri,
    isLoading,
    error,
    retry,
    dimensions,
  };
}

