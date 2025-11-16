import React, { useState } from 'react';
import {
  ImageBackgroundProps,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { DEFAULT_IMAGE } from '../../assets/images';
import { Text } from '../core-ui/Text';
import { ShowImageModal } from '../components/ShowImageModal';
import { makeStyles } from '../theme';
import { convertUrl, resolveUploadUrl } from '../helpers';
import { useAuthenticatedImage } from '../hooks';

import CachedImage from './CachedImage';

type Props = Omit<ImageBackgroundProps, 'source' | 'style'> & {
  src: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  debugLabel?: string;
  maxHeightRatio?: number;
};

const DEBUG_IMAGES = __DEV__;

export function CustomImage(props: Props) {
  const styles = useStyles();

  const { src, style, debugLabel, maxHeightRatio = 0.7 } = props;

  const [show, setShow] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  const containerHeight = Math.max(200, windowHeight * maxHeightRatio);
  const normalizedSrc = src ? resolveUploadUrl(convertUrl(src)) : undefined;

  // Use authenticated image hook for remote Discourse images
  const {
    localUri,
    isLoading: isDownloading,
    error: downloadError,
    retry: retryDownload,
  } = useAuthenticatedImage(normalizedSrc);

  // Determine the actual image source to use
  const imgSource = localUri
    ? { uri: localUri }
    : normalizedSrc
      ? { uri: normalizedSrc }
      : { uri: DEFAULT_IMAGE };

  const hasError = !!downloadError;

  if (DEBUG_IMAGES) {
    console.log('[CustomImage]', debugLabel ?? '', {
      src,
      normalizedSrc,
      localUri,
      isDownloading,
      hasError,
      containerHeight,
      imgSource,
    });
  }

  const hideImage = !normalizedSrc;

  const onPress = () => {
    if (!normalizedSrc) {
      return;
    }
    setShow(true);
  };

  const onPressCancel = () => {
    setShow(false);
  };

  const calculatedSizeStyle = {
    height: containerHeight,
  };

  const handleImageError = () => {
    if (DEBUG_IMAGES) {
      console.warn('[CustomImage] error loading image', {
        label: debugLabel,
        src,
        normalizedSrc,
        localUri,
      });
    }
  };

  const handleImageLoad = () => {
    if (DEBUG_IMAGES) {
      console.log('[CustomImage] Image loaded successfully:', {
        label: debugLabel,
        localUri,
        normalizedSrc,
      });
    }
  };

  const handleImageLoadStart = () => {
    // Image started loading
  };

  const retryLoad = () => {
    retryDownload();
    setReloadKey((prev) => prev + 1);
  };

  const renderFallback = (message: string, actionLabel?: string) => (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={actionLabel ? retryLoad : undefined}
      disabled={!actionLabel}
      style={styles.fallback}
    >
      <Text variant="semibold" size="s" style={styles.fallbackTitle}>
        {message}
      </Text>
      {actionLabel ? (
        <Text size="xs" color="textLight">
          {actionLabel}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const content = (
    <View style={[styles.imageContainer, calculatedSizeStyle, style]}>
      {isDownloading ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: 'yellow', justifyContent: 'center', alignItems: 'center' }}>
          <Text>LOADING...</Text>
        </View>
      ) : hasError ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
          <Text>ERROR</Text>
        </View>
      ) : !normalizedSrc ? (
        <View style={{ width: '100%', height: '100%', backgroundColor: 'gray', justifyContent: 'center', alignItems: 'center' }}>
          <Text>NO IMAGE</Text>
        </View>
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: 'blue' }}>
          <CachedImage
            key={reloadKey}
            source={imgSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onLoadStart={handleImageLoadStart}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </View>
      )}
    </View>
  );

  return normalizedSrc ? (
    <>
      <TouchableOpacity
        delayPressIn={100}
        style={[styles.container, style]}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>

      <ShowImageModal
        show={show}
        userImage={imgSource}
        onPressCancel={onPressCancel}
      />
    </>
  ) : (
    <View style={[styles.imageContainer, calculatedSizeStyle, style]}>
      {renderFallback(t('No image available'))}
    </View>
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    flexDirection: 'row',
  },
  imageContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
    width: '100%',
    height: '100%',
  },
  fallbackTitle: {
    marginBottom: spacing.xs,
  },
}));
