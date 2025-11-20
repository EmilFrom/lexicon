import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { AuthenticatedImage } from '../core-ui/AuthenticatedImage';
import { Text } from '../core-ui/Text';
import { makeStyles, useTheme } from '../theme';
import { ImageDimension } from '../helpers/api/lexicon';

type Props = {
  images: string[];
  onImagePress: (uri: string) => void;
  // We replace the single serverDimensions prop with the full map
  imageDimensionsMap?: Record<string, ImageDimension>;
};

export function ImageCarousel({ images, onImagePress, imageDimensionsMap }: Props) {
  const styles = useStyles();
  const { spacing } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // 1. Calculate Width
  const contentWidth = windowWidth - (spacing.xxl * 2);

  // 2. Calculate Height based on the FIRST image
  // We use the first image to define the height of the carousel row to prevent jumping
  const carouselHeight = useMemo(() => {
    const firstImageUri = images[0];
    const dimensions = imageDimensionsMap?.[firstImageUri];
    
    // Default aspect ratio (16:9) if nothing is found
    let aspectRatio = 1.0; 

    if (dimensions) {
      if (dimensions.aspectRatio) {
        aspectRatio = dimensions.aspectRatio;
      } else if (dimensions.width && dimensions.height) {
        aspectRatio = dimensions.width / dimensions.height;
      }
    }

    const calculatedHeight = contentWidth / aspectRatio;
    
    // Safety limits: Min 200px, Max 1.5x the width (portrait images)
    const MAX_HEIGHT_RATIO = 5;
    const maxHeight = contentWidth * MAX_HEIGHT_RATIO;

    // Return calculated height clamped between 200 and maxHeight
    return Math.max(Math.min(calculatedHeight, maxHeight), 200);
  }, [images, imageDimensionsMap, contentWidth]);

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
        {images.map((url, index) => {
          // Pass specific dimensions for this image if available
          const specificDims = imageDimensionsMap?.[url];
          
          return (
            <View key={index} style={[styles.imageContainer, { width: contentWidth, height: carouselHeight }]}>
              <AuthenticatedImage
                url={url}
                onPress={() => onImagePress(url)}
                // Set max height ratio to infinity so the AuthenticatedImage fills our calculated container
                maxHeightRatio={Infinity} 
                style={{ width: '100%', height: '100%' }}
                serverDimensions={specificDims}
              />
            </View>
          );
        })}
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
  },
  scrollView: {
    borderRadius: spacing.m,
  },
  imageContainer: {
    borderRadius: spacing.m,
    overflow: 'hidden',
    backgroundColor: colors.backgroundDarker,
  },
  counterBadge: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m, 
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