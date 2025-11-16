import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useAuthenticatedImage } from '../hooks';
import { ImageSkeleton } from './ImageSkeleton';

type Props = {
  url: string;
  style?: ViewStyle;
  testID?: string;
  onPress?: (imageUri: string) => void;
  showSkeleton?: boolean;
  maxHeightRatio?: number;
};

/**
 * Authenticated image component with proper sizing and aspect ratio preservation
 * - Full width display
 * - Preserves aspect ratio
 * - Caps at maxHeightRatio of viewport height (default 70%)
 * - Shows loading skeleton
 * - Supports tap to full-screen
 */
export function AuthenticatedImage({
  url,
  style,
  testID,
  onPress,
  showSkeleton = true,
  maxHeightRatio = 0.7,
}: Props) {
  const { localUri, isLoading, error, retry, dimensions } =
    useAuthenticatedImage(url);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Calculate image height based on dimensions and constraints
  const calculateImageHeight = () => {
    if (!dimensions) {
      // Default height while dimensions are loading
      return 300;
    }

    const maxHeight = screenHeight * maxHeightRatio;
    const aspectRatio = dimensions.width / dimensions.height;
    const calculatedHeight = screenWidth / aspectRatio;

    return Math.min(calculatedHeight, maxHeight);
  };

  const imageHeight = calculateImageHeight();

  if (__DEV__) {
    console.log('[AuthenticatedImage]', {
      url,
      localUri,
      isLoading,
      hasError: !!error,
      dimensions,
      imageHeight,
    });
  }

  // Loading state
  if (isLoading) {
    return showSkeleton ? (
      <ImageSkeleton width="100%" height={imageHeight} style={style} />
    ) : (
      <View
        style={[styles.container, { height: imageHeight }, style]}
        testID={testID}
      >
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.error, { height: imageHeight }, style]}
        onPress={retry}
        testID={testID}
      >
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Failed to load image</Text>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    );
  }

  // No local URI yet
  if (!localUri) {
    return showSkeleton ? (
      <ImageSkeleton width="100%" height={imageHeight} style={style} />
    ) : null;
  }

  // Success - render the image
  const imageContent = (
    <View
      style={[styles.imageContainer, { height: imageHeight }, style]}
      testID={testID}
    >
      <Image
        source={{ uri: localUri }}
        style={styles.image}
        resizeMode="cover"
        onLoad={() => {
          if (__DEV__) {
            console.log('[AuthenticatedImage] Image rendered:', localUri);
          }
        }}
        onError={(e) => {
          if (__DEV__) {
            console.error(
              '[AuthenticatedImage] Image render error:',
              e.nativeEvent.error,
            );
          }
        }}
      />
    </View>
  );

  // If onPress is provided, wrap in TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => onPress(localUri)}
        activeOpacity={0.9}
        testID={testID}
      >
        {imageContent}
      </TouchableOpacity>
    );
  }

  return imageContent;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  error: {
    backgroundColor: '#FFE5E5',
    padding: 20,
  },
  text: {
    fontSize: 14,
    color: '#666',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#666',
  },
});
