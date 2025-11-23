import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import ImageView from 'react-native-image-viewing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../core-ui'; // Assuming Icon component is in core-ui

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
};

export function FullScreenImageModal({ visible, imageUri, onClose }: Props) {
  const images = imageUri ? [{ uri: imageUri }] : [];
  const insets = useSafeAreaInsets();

  const CustomHeader = () => (
    <View style={[styles.header, { top: insets.top }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Icon name="ChevronDown" size="xl" color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageView
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      HeaderComponent={CustomHeader} // Use the custom header
      presentationStyle="overFullScreen" // Ensures it covers the status bar
      backgroundColor="rgba(0,0,0,0.85)" // Darker, more immersive background
    />
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Semi-transparent background
  },
  closeButton: {
    alignSelf: 'flex-start', // Position to the left
    padding: 8, // Larger touch area
  },
});
