// src/core-ui/CachedImage.tsx
// A modern replacement for the legacy class component, using expo-image.

import React from 'react';
import { Image } from 'expo-image'; // <-- Import the modern Image component
import { ImageStyle, ImageURISource, StyleProp } from 'react-native';
import ImageView from 'react-native-image-viewing';

// Define the props for our new component. They are much simpler now.
type Props = {
  source: Omit<ImageURISource, 'uri'> & { uri: string };
  style: StyleProp<ImageStyle>;
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
        images={[{ uri: source.uri }]}
        imageIndex={0}
        visible={visible}
        onRequestClose={setVisible}
        animationType="fade"
      />
    );
  }

  // The core of the component is now just the <Image> from expo-image.
  // We pass the props through and set the caching policy.
  return (
    <Image
      {...rest}
      source={source}
      style={style}
      // This single prop replaces all the old file system logic.
      // 'disk' means it will be cached on the device's storage.
      cachePolicy="disk"
    />
  );
};

export default CachedImage;
