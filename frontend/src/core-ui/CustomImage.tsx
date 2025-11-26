import React, { useState } from 'react';
import {
  ImageBackgroundProps,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
  ImageErrorEventData,
} from 'react-native';
import { useReactiveVar } from '@apollo/client';

import { DEFAULT_IMAGE } from '../../assets/images';
import { Text } from '../core-ui/Text';
import { ShowImageModal } from '../components/ShowImageModal';
import { makeStyles } from '../theme';
import { convertUrl, resolveUploadUrl } from '../helpers';
import { tokenVar } from '../reactiveVars';

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
  const token = useReactiveVar(tokenVar);

  const { src, style, debugLabel, maxHeightRatio = 0.7 } = props;

  const [show, setShow] = useState(false);
  const [isDownloading, setIsDownloading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const { height: windowHeight } = useWindowDimensions();

  const containerHeight = Math.max(200, windowHeight * maxHeightRatio);
  const normalizedSrc = src ? resolveUploadUrl(convertUrl(src)) : undefined;

  const imgSource = normalizedSrc
    ? {
      uri: normalizedSrc,
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    }
    : { uri: DEFAULT_IMAGE };

  if (DEBUG_IMAGES) {
    console.log('[CustomImage]', debugLabel ?? '', {
      src,
      normalizedSrc,
      isDownloading,
      hasError,
      containerHeight,
    });
  }

  const onPressImage = () => {
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

  const handleImageError = (e: ImageErrorEventData) => {
    setHasError(true);
    setIsDownloading(false);
    if (DEBUG_IMAGES) {
      console.warn('[CustomImage] error:', e.error);
    }
  };

  const handleImageLoad = () => {
    setIsDownloading(false);
  };

  const handleImageLoadStart = () => {
    setIsDownloading(true);
    setHasError(false);
  };

  const renderFallback = (message: string) => (
    <View style={styles.fallback}>
      <Text variant="semibold" size="s" style={styles.fallbackTitle}>
        {message}
      </Text>
    </View>
  );

  const content = (
    <View style={[styles.imageContainer, calculatedSizeStyle, style]}>
      {/* Loading State */}
      {isDownloading && (
        <View style={[styles.centered, styles.loadingBg]}>
          <Text>Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {hasError && (
        <View style={[styles.centered, styles.errorBg]}>
          <Text style={{ color: 'white' }}>Failed to load</Text>
        </View>
      )}

      {/* Image */}
      {!hasError && normalizedSrc && (
        <View style={{ width: '100%', height: '100%', position: 'absolute' }}>
          <CachedImage
            source={imgSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onLoadStart={handleImageLoadStart}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </View>
      )}

      {!normalizedSrc && renderFallback('No image available')}
    </View>
  );

  return normalizedSrc ? (
    <>
      <TouchableOpacity
        delayPressIn={100}
        style={[styles.container, style]}
        onPress={onPressImage}
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
      {renderFallback('No image available')}
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
  centered: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
  },
  loadingBg: {
    backgroundColor: '#f0f0f0',
  },
  errorBg: {
    backgroundColor: '#ffebee',
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