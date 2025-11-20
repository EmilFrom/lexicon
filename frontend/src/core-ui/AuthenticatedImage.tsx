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
  maxHeightRatio = 5,
  serverDimensions,
}: Props) {
  const token = useReactiveVar(tokenVar);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const source = useMemo(() => ({
    uri: url,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }), [url, token]);

  const calculateImageHeight = () => {
    let aspectRatio = 1.0; // Default 16:9

    if (serverDimensions && serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
      if (serverDimensions.aspectRatio) {
        aspectRatio = serverDimensions.aspectRatio;
      }
    }
    
    const calculatedHeight = screenWidth / aspectRatio;
    
    // --- FIX START: Safety fallback ---
    if (!calculatedHeight || isNaN(calculatedHeight) || calculatedHeight <= 0) {
        return 300; // Safe default height
    }
    // --- FIX END ---

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

  const imageContent = (
    <View style={[styles.imageContainer, { height: imageHeight }, style]} testID={testID}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        cachePolicy="memory-disk"
      />
      {isLoading && showSkeleton && (
        <View style={StyleSheet.absoluteFill}>
          <ImageSkeleton width="100%" height="100%" />
        </View>
      )}
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
    backgroundColor: '#F0F0F0',
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