import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import ImageView from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '../core-ui';
import { t } from '../i18n/translate';

type Props = {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
};

const DOWNLOAD_FILE_PREFIX = 'lexicon-fullscreen';

/**
 * Full-screen image viewer with pinch-to-zoom and swipe-to-dismiss
 * - Adds a header with large close, share, and save actions
 * - Shows feedback when saving/sharing
 */
export function FullScreenImageModal({ visible, imageUri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);

  const images = useMemo(() => (imageUri ? [{ uri: imageUri }] : []), [imageUri]);

  const showMessage = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  const handleShare = async () => {
    if (!imageUri) {
      return;
    }

    try {
      await Share.share({ url: imageUri });
    } catch (error) {
      console.error('[FullScreenImageModal] Share failed', error);
      showMessage('Unable to share image');
    }
  };

  const handleSave = async () => {
    if (!imageUri) {
      return;
    }

    setIsSaving(true);
    try {
      const { status: existingStatus } = await MediaLibrary.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          showMessage('Storage permission denied');
          setIsSaving(false);
          return;
        }
      }

      const fileName = `${DOWNLOAD_FILE_PREFIX}-${Date.now()}.jpg`;
      const targetPath = `${FileSystem.cacheDirectory}${fileName}`;
      const { uri } = await FileSystem.downloadAsync(imageUri, targetPath);
      await MediaLibrary.saveToLibraryAsync(uri);
      showMessage('Image saved to camera roll');
    } catch (error) {
      console.error('[FullScreenImageModal] Save failed', error);
      showMessage('Unable to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const header = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity
        onPress={onClose}
        hitSlop={20}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close full screen image"
      >
        <Icon name="Close" size="l" color="#FFF" />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
          <Icon name="Send" size="m" color="#FFF" />
          <Text style={styles.actionLabel}>{t('Share')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.actionButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" style={styles.actionLabel} />
          ) : (
            <>
              <Icon name="Photo" size="m" color="#FFF" />
              <Text style={styles.actionLabel}>{t('Save')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageView
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      presentationStyle="fullScreen"
      swipeToCloseEnabled
      HeaderComponent={header}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1,
  },
  closeButton: {
    padding: 12,
    zIndex: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  actionLabel: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
  },
});