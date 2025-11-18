# Implementation Guide: Final Image Fix V2

This guide implements the changes required to fix missing images on the Post Detail screen and prevent images from blanking out during scroll.

## Step 1: Fix `markdownToHtml.ts`

**Objective:** Enable HTML tag parsing so that `<img>` tags from the server are not escaped.

**File:** `src/helpers/markdownToHtml.ts`

**Action:** Replace the file content with the following:

```typescript
import MarkdownIt from 'markdown-it';

// Initialize the parser once and reuse it for better performance.
// html: true is required to allow server-sent <img> tags to be rendered
const md = new MarkdownIt({ html: true });

/**
 * Converts a Markdown string to an HTML string.
 * @param markdown The raw Markdown content.
 * @returns An HTML string.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return md.render(markdown);
}
```

---

## Step 2: Optimize `AuthenticatedImage.tsx`

**Objective:** Stabilize image rendering during scroll by memoizing the source and improving cache policy.

**File:** `src/core-ui/AuthenticatedImage.tsx`

**Action:** Replace the file content with the following:

```typescript
import { Image } from 'expo-image';
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useReactiveVar } from '@apollo/client';

import { tokenVar } from '../reactiveVars';
import { ImageSkeleton } from './ImageSkeleton';

type Props = {
  url: string;
  style?: ViewStyle;
  testID?: string;
  onPress?: (imageUri: string) => void;
  showSkeleton?: boolean;
  maxHeightRatio?: number;
  serverDimensions?: { width: number; height: number; aspectRatio?: number };
};

/**
 * Authenticated image component using expo-image for caching and performance.
 */
export function AuthenticatedImage({
  url,
  style,
  testID,
  onPress,
  showSkeleton = true,
  maxHeightRatio = 1.5,
  serverDimensions,
}: Props) {
  const token = useReactiveVar(tokenVar);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // MEMOIZE THE SOURCE
  // This prevents the Image component from flickering or resetting when 
  // parent components re-render but the URL hasn't changed.
  const source = useMemo(() => ({
    uri: url,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }), [url, token]);

  // Calculate image height
  const calculateImageHeight = () => {
    // Default aspect ratio if unknown (16:9 approx)
    let aspectRatio = 1.77; 

    if (serverDimensions && serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
      if (serverDimensions.aspectRatio) {
        aspectRatio = serverDimensions.aspectRatio;
      }
    }
    
    const calculatedHeight = screenWidth / aspectRatio;

    if (maxHeightRatio === 0 || maxHeightRatio === Infinity) {
      return calculatedHeight;
    }

    const maxHeight = screenHeight * maxHeightRatio;
    return Math.min(calculatedHeight, maxHeight);
  };

  const imageHeight = calculateImageHeight();

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (e: any) => {
    if (__DEV__) {
      console.error('[AuthenticatedImage] Error:', e?.nativeEvent?.error);
    }
    setHasError(true);
    setIsLoading(false);
  };

  // Render content
  const imageContent = (
    <View style={[styles.imageContainer, { height: imageHeight }, style]} testID={testID}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        cachePolicy="memory-disk" // Allow memory caching for smoother scrolling
      />
      {/* Show skeleton while loading */}
      {isLoading && showSkeleton && (
        <View style={StyleSheet.absoluteFill}>
          <ImageSkeleton width="100%" height="100%" />
        </View>
      )}
      {/* Show error state */}
      {hasError && (
        <View style={[styles.container, styles.error, StyleSheet.absoluteFill]}>
           <Text style={styles.errorIcon}>⚠️</Text>
           <Text style={styles.retryText}>Failed to load</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={() => onPress(url)} activeOpacity={0.9}>
        {imageContent}
      </TouchableOpacity>
    );
  }

  return imageContent;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0', // Slight background while loading
  },
  image: {
    width: '100%',
    height: '100%',
  },
  error: {
    backgroundColor: '#FFE5E5',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#D32F2F',
  },
});
```

---

## Step 3: Verification

1.  **Restart the app:** Run `yarn start` to ensure clean bundling.
2.  **Check Post Detail:** Navigate to a post that previously had missing images. They should now appear.
3.  **Check Scrolling:** Scroll rapidly through a list of images. They should remain visible and not flicker to white/blank.
