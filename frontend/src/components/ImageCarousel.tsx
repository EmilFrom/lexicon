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
import { makeStyles, useTheme } from '../theme';

type Props = {
  images: string[];
  onImagePress: (uri: string) => void;
  // This prop is passed through from PostItem for the first image
  serverDimensions?: { width: number; height: number; aspectRatio?: number };
};

export function ImageCarousel({ images, onImagePress, serverDimensions }: Props) {
  const styles = useStyles();
   const { spacing } = useTheme(); // Get spacing from theme
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // 1. Calculate Width
  // The parent PostItem has horizontal padding of spacing.xxl.
  // The carousel itself has 0 horizontal padding now.
  // So the available width for the content is Window Width - (Parent Padding * 2)
  const contentWidth = windowWidth - (spacing.xxl * 2);

  // 2. Calculate Height
  // Use server dimensions if available, otherwise default to 16:9 (1.77)
  let aspectRatio = 1.0; // Default
  if (serverDimensions) {
    // The server returns 'aspectRatio' directly now
    if (serverDimensions.aspectRatio) {
      aspectRatio = serverDimensions.aspectRatio;
    } else if (serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
    }
  }
  
  // Calculate the natural height based on width and aspect ratio
  // (Width / AspectRatio = Height)
  const naturalHeight = contentWidth / aspectRatio;

  // Define the maximum allowed height ratio (e.g., 1.5 means height can be 1.5x the width)
  const MAX_HEIGHT_RATIO = 1.5;
  const maxHeight = contentWidth * MAX_HEIGHT_RATIO;

  // Use the natural height, but cap it at maxHeight. 
  // Also keep a safety minimum of 200 to prevent collapse.
  const carouselHeight = Math.max(Math.min(naturalHeight, maxHeight), 200);
  
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
    // paddingHorizontal removed to avoid double-padding
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