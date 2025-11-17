// frontend/src/hooks/useAuthenticatedImage.ts
import { useState, useEffect } from 'react';
import { useReactiveVar } from '@apollo/client';

import { tokenVar } from '../reactiveVars';
import { imageCacheManager } from '../helpers/imageCache';
import { resolveUploadUrl } from '../helpers/resolveUploadUrl';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [dimensions, setDimensions] = useState<
    { width: number; height: number; aspectRatio?: number } | undefined
  >(serverDimensions);

  const resolvedUrl = resolveUploadUrl(remoteUrl);

  useEffect(() => {
    if (__DEV__) {
      console.log('[useAuthenticatedImage] Effect triggered:', {
        url: resolvedUrl,
        enabled,
        hasToken: !!token,
        currentLocalUri: localUri,
        hasServerDimensions: !!serverDimensions,
      });
    }

    if (serverDimensions && !dimensions) {
      setDimensions(serverDimensions);
    }

    if (!resolvedUrl || !enabled) {
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
        setIsLoading(true);
        setError(null);

        if (__DEV__) {
          console.log('[useAuthenticatedImage] Loading:', {
            url: resolvedUrl,
            hasToken: !!token,
            tokenLength: token?.length,
          });
        }

        const cachedUri = await imageCacheManager.getCachedImage(resolvedUrl, {
          maxAge,
          maxSize,
        });

        if (cachedUri && !cancelled) {
          if (__DEV__) {
            console.log('[useAuthenticatedImage] Using cached:', cachedUri);
          }
          if (!serverDimensions) {
            const cachedDimensions =
              await imageCacheManager.getCachedImageDimensions(resolvedUrl);
            setDimensions(cachedDimensions);
          }
          setLocalUri(cachedUri);
          setIsLoading(false);
          return;
        }

        if (!token) {
          throw new Error('No authentication token available');
        }

        const downloadedUri = await imageCacheManager.downloadAndCacheImage(
          resolvedUrl, // <-- THE FIX IS HERE
          token,
          { maxAge, maxSize },
        );

        if (!cancelled) {
          if (!serverDimensions) {
            const downloadedDimensions =
              await imageCacheManager.getCachedImageDimensions(resolvedUrl);
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
            url: resolvedUrl, // <-- AND THE FIX IS HERE
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
  }, [resolvedUrl, token, enabled, maxAge, maxSize, retryCount, serverDimensions, dimensions, localUri]);

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