import React, { useState } from 'react';
import {
  ImageBackgroundProps,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useReactiveVar } from '@apollo/client'; // Added

import {
  AVATAR_ICON_SIZES,
  AVATAR_ICON_SIZE_VARIANTS,
  AVATAR_LETTER_SIZES,
} from '../../constants';
import { makeStyles, useTheme } from '../../theme';
import { convertUrl } from '../../helpers';
import { tokenVar } from '../../reactiveVars'; // Added
// import { useAuthenticatedImage } from '../../hooks'; // Removed

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
  const token = useReactiveVar(tokenVar); // Added

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

  // Removed useAuthenticatedImage hook logic

  const loadChild = src === '' || error; // Simplified loading logic, rely on Image to show empty/loading
  
  // Construct source with headers
  const imgSource = normalizedSrc ? {
    uri: normalizedSrc,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  } : undefined;

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
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
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
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          contentFit="cover"
          cachePolicy="disk"
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