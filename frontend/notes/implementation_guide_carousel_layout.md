# Implementation Guide: Fix Image Carousel Layout

This guide makes the `ImageCarousel` component more robust by ensuring the width calculation is safe and correct. This is the most likely cause for images not appearing despite data being present.

## Step 1: Update `ImageCarousel.tsx`

**File:** `src/components/ImageCarousel.tsx`

**Action:** Update the component to safely calculate `contentWidth` and add debug logging.

```typescript
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { AuthenticatedImage } from '../core-ui/AuthenticatedImage';
import { Text } from '../core-ui/Text';
import { makeStyles } from '../theme';

type Props = {
  images: string[];
  onImagePress: (uri: string) => void;
  // This prop is passed through from PostItem for the first image
  serverDimensions?: { width: number; height: number; aspectRatio?: number };
};

export function ImageCarousel({ images, onImagePress, serverDimensions }: Props) {
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate the width of the content area, accounting for padding
  // Safety check: ensure paddingHorizontal is treated as a number
  const paddingHorizontal = typeof styles.container.paddingHorizontal === 'number'
    ? styles.container.paddingHorizontal
    : 24; // Default fallback if theme value is not a number
    
  const contentWidth = windowWidth - (paddingHorizontal * 2);

  if (__DEV__) {
    console.log('[ImageCarousel] Layout:', { 
      windowWidth, 
      paddingHorizontal, 
      contentWidth, 
      imagesCount: images?.length 
    });
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollPosition / contentWidth);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={[styles.scrollView, { width: contentWidth }]}
        contentContainerStyle={{ width: contentWidth * images.length }} // Explicit content size
      >
        {images.map((url, index) => (
          <View key={index} style={[styles.imageContainer, { width: contentWidth }]}>
            <AuthenticatedImage
              url={url}
              onPress={() => onImagePress(url)}
              maxHeightRatio={0.6} // Give it a nice default aspect ratio
              serverDimensions={index === 0 ? serverDimensions : undefined}
            />
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ spacing, fontSizes, colors }) => ({
  container: {
    marginTop: spacing.m,
    paddingHorizontal: spacing.xxl, // Match PostItem's padding
  },
  scrollView: {
    borderRadius: spacing.m,
  },
  imageContainer: {
    borderRadius: spacing.m,
    overflow: 'hidden',
    backgroundColor: colors.backgroundDarker, // Placeholder color
  },
  counterBadge: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.xxl + spacing.m, // Adjust for container padding
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: spacing.l,
  },
  counterText: {
    color: colors.pureWhite,
    fontSize: fontSizes.s,
    fontWeight: 'bold',
  },
}));
```

## Step 2: Verify

1.  Restart `yarn start`.
2.  Check the logs for `[ImageCarousel] Layout`. Ensure `contentWidth` is a positive number (e.g., ~350 on iPhone).
3.  Check the Post Detail screen. Images should now appear.
