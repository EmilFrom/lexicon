import React from 'react';
import {
  View,
  Image,
  ImageBackgroundProps,
  ViewStyle,
  StyleProp,
} from 'react-native';

import { DEFAULT_IMAGE } from '../../assets/images';
import { convertUrl, isImageValidUrl } from '../helpers';
import { Icon } from '../core-ui';
import { makeStyles } from '../theme';

const variantSize = {
  s: 60,
  m: 84,
};

type Props = Omit<ImageBackgroundProps, 'source' | 'style'> & {
  src: string;
  imageSize?: keyof typeof variantSize;
  style?: StyleProp<ViewStyle>;
  onDelete?: () => void;
  disableDelete?: boolean;
};

export default function SelectImagePreviewEdit(props: Props) {
  // --- FIX: Removed unused 'otherProps' ---
  const {
    src,
    imageSize = 'm',
    onDelete,
    style,
    disableDelete,
  } = props;
  const styles = useStyles();

  const sizeStyle = {
    height: variantSize[imageSize],
    width: variantSize[imageSize],
  };

  const imgSource = isImageValidUrl(src)
    ? { uri: convertUrl(src) }
    : DEFAULT_IMAGE;

  return (
    <View style={[style, styles.container, sizeStyle]}>
      <Image
        source={imgSource}
        style={[styles.image, sizeStyle]}
        resizeMode="cover"
      />
      <Icon
        name="Close"
        size="m"
        style={styles.icon}
        onPress={onDelete}
        disabled={disableDelete}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    position: 'relative',
  },
  image: {
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%',
  },
  icon: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: colors.pureWhite,
    borderRadius: 16,
  },
}));