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
  const contentWidth = windowWidth - styles.container.paddingHorizontal * 2;

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