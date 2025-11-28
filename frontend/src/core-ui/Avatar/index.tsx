import React, { useState } from 'react';
import { TouchableOpacity, StyleProp, ImageStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { useReactiveVar } from '@apollo/client';

import {
  AVATAR_ICON_SIZES,
  AVATAR_ICON_SIZE_VARIANTS,
  AVATAR_LETTER_SIZES,
} from '../../constants';
import { useTheme } from '../../theme';
import { convertUrl } from '../../helpers';
import { tokenVar } from '../../reactiveVars';

import { LetterAvatar } from './LetterAvatar';

type Props = Omit<ImageProps, 'source' | 'style'> & {
  src?: string;
  size?: AVATAR_ICON_SIZE_VARIANTS;
  label?: string;
  color?: string;
  defaultImage?: boolean;
  onPress?: () => void;
  style?: StyleProp<ImageStyle>;
};

export { Props as AvatarProps };

export function Avatar(props: Props) {
  const { colors } = useTheme();
  const token = useReactiveVar(tokenVar);

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

  const finalSize = AVATAR_ICON_SIZES[size];
  const fontSize = AVATAR_LETTER_SIZES[size];

  const normalizedSrc = src ? convertUrl(src) : undefined;

  const loadChild = src === '' || error;

  // Construct source with headers
  const imgSource = normalizedSrc
    ? {
        uri: normalizedSrc,
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }
    : undefined;

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
          contentFit="cover"
          cachePolicy="disk"
          {...otherProps}
        />
      )}
    </TouchableOpacity>
  );
}
