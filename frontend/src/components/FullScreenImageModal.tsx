// src/components/FullScreenImageModal.tsx
import React from 'react';
import { View, TouchableOpacity, Alert, Platform } from 'react-native';
import ImageView from 'react-native-image-viewing';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { Icon, Text } from '../core-ui';
import { makeStyles, useTheme } from '../theme';

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
};

export function FullScreenImageModal({ visible, imageUri, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const images = imageUri ? [{ uri: imageUri }] : [];

  // Function to handle saving the image to the device's media library
  const handleSave = async () => {
    if (!permissionResponse) {
      return;
    }

    let permissions = permissionResponse;
    if (!permissions.granted && permissions.canAskAgain) {
      permissions = await requestPermission();
    }

    if (!permissions.granted) {
      Alert.alert(
        'Permission Required',
        'We need permission to save photos to your device.',
      );
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert('Saved!', 'The image has been saved to your photos.');
    } catch (error) {
      console.error('Failed to save image:', error);
      Alert.alert('Error', 'Could not save the image.');
    }
  };

  // Function to open the native share sheet
  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(imageUri);
    } catch (error) {
      console.error('Failed to share image:', error);
      Alert.alert('Error', 'Could not share the image.');
    }
  };

  // Custom footer with Share and Save buttons
  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.button} onPress={handleShare}>
        <Icon name="Send" color={colors.pureWhite} size="l" />
        <Text color="pureWhite" style={styles.buttonText}>
          Share
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Icon name="Download" color={colors.pureWhite} size="l" />
        <Text color="pureWhite" style={styles.buttonText}>
          Save
        </Text>
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
      FooterComponent={renderFooter}
    />
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.l,
    paddingTop: spacing.l,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  button: {
    alignItems: 'center',
  },
  buttonText: {
    marginTop: spacing.xs,
  },
}));