// src/core-ui/CachedImage.tsx
// A modern replacement for the legacy class component, using expo-image.

import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { Image as RNImage, ImageStyle, StyleProp } from 'react-native';
import ImageView from 'react-native-image-viewing';

type Props = Omit<ImageProps, 'source' | 'style'> & {
  source: NonNullable<ImageProps['source']>;
  style?: StyleProp<ImageStyle>;
  isBackground?: boolean;
  visible?: boolean;
  setVisible?: () => void;
};

const CachedImage = ({
  source,
  style,
  isBackground,
  visible,
  setVisible,
  ...rest
}: Props) => {
  // The special logic for the full-screen image viewer remains.
  if (isBackground && typeof visible === 'boolean' && setVisible) {
    return (
      <ImageView
        images={[
          {
            uri:
              typeof source === 'object' && 'uri' in source ? source.uri : '',
          },
        ]}
        imageIndex={0}
        visible={visible}
        onRequestClose={setVisible}
        animationType="fade"
      />
    );
  }

  // Determine cache policy based on source type
  // For local file:// URIs, use 'memory' since they're already on disk
  // For remote URLs, use 'disk' to cache them
  const isLocalFile =
    typeof source === 'object' &&
    'uri' in source &&
    source.uri?.startsWith('file://');
  const cachePolicy = isLocalFile ? 'memory' : 'disk';

  if (__DEV__) {
    console.log('[CachedImage] Rendering:', {
      sourceType: typeof source,
      uri: typeof source === 'object' && 'uri' in source ? source.uri : 'N/A',
      isLocalFile,
      cachePolicy,
      hasStyle: !!style,
    });
  }

  // For local file:// URIs, use React Native's Image component
  // For remote URLs, use expo-image with caching
  if (isLocalFile) {
    return (
      <RNImage
        source={
          typeof source === 'object' && 'uri' in source
            ? {
                uri: source.uri,
                ...(typeof source.width === 'number' && {
                  width: source.width,
                }),
                ...(typeof source.height === 'number' && {
                  height: source.height,
                }),
              }
            : (source as number)
        }
        style={style}
        resizeMode="cover"
        onLoad={() => {
          if (__DEV__) {
            console.log(
              '[CachedImage] RN Image loaded:',
              typeof source === 'object' && 'uri' in source
                ? source.uri
                : 'N/A',
            );
          }
          // Note: RN Image onLoad has different signature than expo-image, so we don't forward
        }}
        onError={(error) => {
          if (__DEV__) {
            console.error('[CachedImage] RN Image error:', {
              uri:
                typeof source === 'object' && 'uri' in source
                  ? source.uri
                  : 'N/A',
              error,
            });
          }
          // Note: RN Image onError has different signature than expo-image, so we don't forward
        }}
      />
    );
  }

  // The core of the component is now just the <Image> from expo-image.
  // We pass the props through and set the caching policy.
  return (
    <ExpoImage
      {...rest}
      source={source}
      style={style}
      cachePolicy={cachePolicy}
      onLoad={(event) => {
        if (__DEV__) {
          console.log(
            '[CachedImage] Expo Image loaded:',
            typeof source === 'object' && 'uri' in source ? source.uri : 'N/A',
          );
        }
        rest.onLoad?.(event);
      }}
      onError={(error) => {
        if (__DEV__) {
          console.error('[CachedImage] Expo Image error:', {
            uri:
              typeof source === 'object' && 'uri' in source
                ? source.uri
                : 'N/A',
            error,
          });
        }
        rest.onError?.(error);
      }}
    />
  );
};

export default CachedImage;
