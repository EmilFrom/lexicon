import React, { ReactNode } from 'react';
import { Text as BaseText, TextProps } from 'react-native';

import { Color, FontSize, FontVariant, useTheme } from '../theme';

type Props = TextProps & {
  variant?: FontVariant;
  size?: FontSize;
  color?: Color;
  children?: ReactNode;
};

export function Text(props: Props) {
  const { colors, fontSizes, fontVariants } = useTheme();

  const {
    variant = 'normal',
    size = 'm',
    color = 'textNormal',
    style,
    ...otherProps
  } = props;

  const fontStyles = fontVariants[variant];
  const fontSize = fontSizes[size];
  const fontColor = colors[color];

  return (
    <BaseText
      style={[fontStyles, { fontSize, color: fontColor }, style]}
      {...otherProps}
    />
  );
}
