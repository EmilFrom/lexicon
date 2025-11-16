import React, { useState } from 'react';
import {
  ImageBackground,
  ImageBackgroundProps,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';

import {
  AVATAR_ICON_SIZES,
  AVATAR_ICON_SIZE_VARIANTS,
  AVATAR_LETTER_SIZES,
} from '../../constants';
import { makeStyles, useTheme } from '../../theme';
import { convertUrl } from '../../helpers';
import { useAuthenticatedImage } from '../../hooks';

import { LetterAvatar } from './LetterAvatar';

type Props = Omit<ImageBackgroundProps, 'source'> & {
  src?: string;
  size?: AVATAR_ICON_SIZE_VARIANTS;
  label?: string;
  color?: string;
  defaultImage?: boolean;
  onPress?: () => void;
};

export { Props as AvatarProps };

export function Avatar(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();

  const {
    src = '',
    size = 's',
    color = colors.textLighter,
    style,
    label = '',
    onPress,
    ...otherProps
  } = props;

  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const finalSize = AVATAR_ICON_SIZES[size];
  const fontSize = AVATAR_LETTER_SIZES[size];

  const normalizedSrc = src ? convertUrl(src) : undefined;

  // Use authenticated image hook for remote avatars
  const { localUri, isLoading: isDownloading } =
    useAuthenticatedImage(normalizedSrc);

  const loadChild = src === '' || error || isDownloading;
  const imgSource = localUri ? { uri: localUri } : { uri: normalizedSrc };

  const letterAvatar = (
    <LetterAvatar
      size={finalSize}
      color={color}
      label={label}
      style={style}
      fontSize={fontSize}
    />
  );

  return (
    <TouchableOpacity onPress={onPress}>
      {loadChild ? (
        letterAvatar
      ) : (
        <Image
          source={imgSource}
          style={[
            { width: finalSize, height: finalSize, borderRadius: 100 },
            style,
          ]}
          onError={() => setError(true)}
          onLoadEnd={() => setLoading(false)}
          contentFit="cover"
          {...otherProps}
        />
      )}
    </TouchableOpacity>
  );
}

const useStyles = makeStyles(() => ({
  circle: {
    borderRadius: 100,
  },
}));
