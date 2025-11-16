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
import { useReactiveVar } from '@apollo/client';

import { DEFAULT_IMAGE } from '../../assets/images';
import { Text } from '../core-ui/Text';
import { ShowImageModal } from '../components/ShowImageModal';
import { makeStyles } from '../theme';
import { convertUrl, resolveUploadUrl } from '../helpers';

import CachedImage from './CachedImage';
import { tokenVar } from '../reactiveVars';
import { getDiscourseAuthHeaders } from '../helpers/discourseAuthHeaders';

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
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { height: windowHeight } = useWindowDimensions();

  const containerHeight = Math.max(200, windowHeight * maxHeightRatio);
  const token = useReactiveVar(tokenVar);
  const normalizedSrc = src ? resolveUploadUrl(convertUrl(src)) : undefined;
  const remoteSource = normalizedSrc
    ? {
        uri: normalizedSrc,
        headers: getDiscourseAuthHeaders(token),
      }
    : undefined;
  const imgSource = remoteSource ?? { uri: DEFAULT_IMAGE };

  if (DEBUG_IMAGES) {
    console.log('[CustomImage]', debugLabel ?? '', {
      src,
      normalizedSrc,
      containerHeight,
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
      });
    }
    setHasError(true);
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

  const handleImageLoadStart = () => {
    setHasError(false);
  };

  const retryLoad = () => {
    setHasError(false);
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
      {!hasError && normalizedSrc ? (
      <CachedImage
          key={reloadKey}
        source={imgSource}
          style={[styles.image, StyleSheet.absoluteFill]}
          contentFit="cover"
          onLoadStart={handleImageLoadStart}
          onError={handleImageError}
          onLoad={handleImageLoad}
      />
      ) : (
        renderFallback(
          hideImage ? t('Image unavailable') : t('Failed to load image'),
          normalizedSrc ? t('Tap to retry') : undefined,
        )
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
