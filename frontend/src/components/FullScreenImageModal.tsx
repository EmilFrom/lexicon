import React from 'react';
import ImageView from 'react-native-image-viewing';

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
};

/**
 * Full-screen image viewer with pinch-to-zoom and swipe-to-dismiss
 * Uses react-native-image-viewing for gestures
 */
export function FullScreenImageModal({ visible, imageUri, onClose }: Props) {
  const images = imageUri ? [{ uri: imageUri }] : [];

  return (
    <ImageView
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    />
  );
}
