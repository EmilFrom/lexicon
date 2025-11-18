# Implementation Guide: Fix Image Caching and Scrolling Performance

This guide provides step-by-step instructions to replace the custom `useAuthenticatedImage` hook with the optimized `expo-image` library. This will resolve flickering issues during scrolling and improve overall performance.

## Prerequisites
- Ensure you are in the project root.
- Required packages (`expo-image`, `@apollo/client`) are already installed.

---

## Step 1: Refactor `AuthenticatedImage.tsx`

**File:** `src/core-ui/AuthenticatedImage.tsx`

Replace the entire content of the file with the following code. This replaces the custom hook with `expo-image`'s built-in auth header support while maintaining all existing props and layout logic.

```typescript
import { Image } from 'expo-image';
import React, { useState } from 'react';
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

  // Construct source with auth headers
  const source = {
    uri: url,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  };

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
        cachePolicy="disk"
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

## Step 2: Refactor `Avatar/index.tsx`

**File:** `src/core-ui/Avatar/index.tsx`

Update imports and the `Avatar` component to remove `useAuthenticatedImage` and use `tokenVar`.

```typescript
import React, { useState } from 'react';
import {
  ImageBackgroundProps,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useReactiveVar } from '@apollo/client'; // Added

import {
  AVATAR_ICON_SIZES,
  AVATAR_ICON_SIZE_VARIANTS,
  AVATAR_LETTER_SIZES,
} from '../../constants';
import { makeStyles, useTheme } from '../../theme';
import { convertUrl } from '../../helpers';
import { tokenVar } from '../../reactiveVars'; // Added
// import { useAuthenticatedImage } from '../../hooks'; // Removed

import { LetterAvatar } from './LetterAvatar';

type Props = Omit<ImageBackgroundProps, 'source'> & {
  src?: string;
  size?: AVATAR_ICON_SIZE_VARIANTS;
  label?: string;
  color?: string;
  defaultImage?: boolean;
  onPress?: () => void;
};

export { Props as AvatarProps };

export function Avatar(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const token = useReactiveVar(tokenVar); // Added

  const {
    src = '',
    size = 's',
    color = colors.textLighter,
    style,
    label = '',
    onPress,
    ...otherProps
  } = props;

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const finalSize = AVATAR_ICON_SIZES[size];
  const fontSize = AVATAR_LETTER_SIZES[size];

  const normalizedSrc = src ? convertUrl(src) : undefined;

  // Removed useAuthenticatedImage hook logic

  const loadChild = src === '' || error; // Simplified loading logic, rely on Image to show empty/loading
  
  // Construct source with headers
  const imgSource = normalizedSrc ? {
    uri: normalizedSrc,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  } : undefined;

  const letterAvatar = (
    <LetterAvatar
      size={finalSize}
      color={color}
      label={label}
      style={style}
      fontSize={fontSize}
    />
  );

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      {loadChild ? (
        letterAvatar
      ) : (
        <Image
          source={imgSource}
          style={[
            { width: finalSize, height: finalSize, borderRadius: 100 },
            style,
          ]}
          onError={() => setError(true)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          contentFit="cover"
          cachePolicy="disk"
          {...otherProps}
        />
      )}
    </TouchableOpacity>
  );
}

const useStyles = makeStyles(() => ({
  circle: {
    borderRadius: 100,
  },
}));
```

---

## Step 3: Refactor `CustomImage.tsx`

**File:** `src/core-ui/CustomImage.tsx`

Replace the hook with direct usage of `CachedImage` (which wraps `expo-image`) and pass the token manually.

```typescript
import React, { useState } from 'react';
import {
  ImageBackgroundProps,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useReactiveVar } from '@apollo/client';

import { DEFAULT_IMAGE } from '../../assets/images';
import { Text } from '../core-ui/Text';
import { ShowImageModal } from '../components/ShowImageModal';
import { makeStyles } from '../theme';
import { convertUrl, resolveUploadUrl } from '../helpers';
import { tokenVar } from '../reactiveVars';

import CachedImage from './CachedImage';

type Props = Omit<ImageBackgroundProps, 'source' | 'style'> & {
  src: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  debugLabel?: string;
  maxHeightRatio?: number;
};

const DEBUG_IMAGES = __DEV__;

export function CustomImage(props: Props) {
  const styles = useStyles();
  const token = useReactiveVar(tokenVar);

  const { src, style, debugLabel, maxHeightRatio = 0.7 } = props;

  const [show, setShow] = useState(false);
  // Local loading state
  const [isDownloading, setIsDownloading] = useState(!!src);
  const [hasError, setHasError] = useState(false);
  
  const { height: windowHeight } = useWindowDimensions();

  const containerHeight = Math.max(200, windowHeight * maxHeightRatio);
  const normalizedSrc = src ? resolveUploadUrl(convertUrl(src)) : undefined;

  // Construct source with headers
  const imgSource = normalizedSrc
    ? { 
        uri: normalizedSrc,
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      }
    : { uri: DEFAULT_IMAGE };

  if (DEBUG_IMAGES) {
    console.log('[CustomImage]', debugLabel ?? '', {
      src,
      normalizedSrc,
      isDownloading,
      hasError,
      containerHeight,
    });
  }

  const onPressImage = () => {
    if (!normalizedSrc) {
      return;
    }
    setShow(true);
  };

  const onPressCancel = () => {
    setShow(false);
  };

  const calculatedSizeStyle = {
    height: containerHeight,
  };

  const handleImageError = (e: any) => {
    setHasError(true);
    setIsDownloading(false);
    if (DEBUG_IMAGES) {
      console.warn('[CustomImage] error:', e);
    }
  };

  const handleImageLoad = () => {
    setIsDownloading(false);
  };

  const handleImageLoadStart = () => {
    setIsDownloading(true);
    setHasError(false);
  };

  const renderFallback = (message: string) => (
    <View style={styles.fallback}>
      <Text variant="semibold" size="s" style={styles.fallbackTitle}>
        {message}
      </Text>
    </View>
  );

  const content = (
    <View style={[styles.imageContainer, calculatedSizeStyle, style]}>
      {/* Loading State */}
      {isDownloading && (
        <View style={[styles.centered, styles.loadingBg]}>
           <Text>Loading...</Text>
        </View>
      )}
      
      {/* Error State */}
      {hasError && (
        <View style={[styles.centered, styles.errorBg]}>
           <Text style={{color: 'white'}}>Failed to load</Text>
        </View>
      )}

      {/* Image */}
      {(!hasError && normalizedSrc) && (
         <View style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <CachedImage
              source={imgSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              onLoadStart={handleImageLoadStart}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
         </View>
      )}
      
      {!normalizedSrc && renderFallback('No image available')}
    </View>
  );

  return normalizedSrc ? (
    <>
      <TouchableOpacity
        delayPressIn={100}
        style={[styles.container, style]}
        onPress={onPressImage}
      >
        {content}
      </TouchableOpacity>

      <ShowImageModal
        show={show}
        userImage={imgSource}
        onPressCancel={onPressCancel}
      />
    </>
  ) : (
    <View style={[styles.imageContainer, calculatedSizeStyle, style]}>
      {renderFallback('No image available')}
    </View>
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    flexDirection: 'row',
  },
  imageContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centered: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  loadingBg: {
    backgroundColor: '#f0f0f0',
  },
  errorBg: {
    backgroundColor: '#ffebee',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
    width: '100%',
    height: '100%',
  },
  fallbackTitle: {
    marginBottom: spacing.xs,
  },
}));
```

---

## Step 4: Clean up `src/hooks/index.ts`

**File:** `src/hooks/index.ts`

Find and remove the following line:

```typescript
export * from './useAuthenticatedImage';
```

---

## Step 5: Delete the Old Hook

Delete the file: `src/hooks/useAuthenticatedImage.ts`

---

## Step 6: Verify

Run your project (`yarn start`) and verify:
1.  The **Image Carousel** (e.g., in post details) still works, images load, and tapping them opens the full view.
2.  **Avatars** load correctly.
3.  **Custom Images** (embedded in posts) load correctly.
4.  Scrolling through lists with many images should be smoother with less flickering.
