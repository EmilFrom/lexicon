# Implementation Guide: Force Carousel Height

This guide fixes the invisible image carousel by explicitly calculating and setting the height of the carousel container.

## Step 1: Update `ImageCarousel.tsx`

**File:** `src/components/ImageCarousel.tsx`

**Action:** Replace the file content with the following robust implementation. This version calculates `carouselHeight` and ensures the ScrollView has explicit dimensions.

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

  // 1. Calculate Width
  const paddingHorizontal = typeof styles.container.paddingHorizontal === 'number'
    ? styles.container.paddingHorizontal
    : 24; 
  const contentWidth = windowWidth - (paddingHorizontal * 2);

  // 2. Calculate Height
  // Use server dimensions if available, otherwise default to 16:9 (1.77)
  let aspectRatio = 1.77;
  if (serverDimensions) {
    if (serverDimensions.aspectRatio) {
      aspectRatio = serverDimensions.aspectRatio;
    } else if (serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
    }
  }
  
  // Calculate height based on width and aspect ratio
  // Clamp to a minimum of 200 to prevent collapse
  const carouselHeight = Math.max(contentWidth / aspectRatio, 200);

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
    <View style={[styles.container, { height: carouselHeight }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={[styles.scrollView, { width: contentWidth, height: carouselHeight }]}
        contentContainerStyle={{ width: contentWidth * images.length, height: carouselHeight }}
      >
        {images.map((url, index) => (
          <View key={index} style={[styles.imageContainer, { width: contentWidth, height: carouselHeight }]}>
            <AuthenticatedImage
              url={url}
              onPress={() => onImagePress(url)}
              // Pass 0 or Infinity to prevent AuthenticatedImage from recalculating/clamping height again
              // We want it to just fill the container we made for it
              maxHeightRatio={Infinity} 
              style={{ width: '100%', height: '100%' }}
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
2.  Navigate to Post Detail.
3.  The carousel should now occupy exactly the calculated height, and images should be visible.
