import { useMemo } from 'react';
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { Theme } from './theme';
import { useTheme } from './ThemeProvider';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

type Creator<T> = (theme: Theme) => T;

export function makeStyles<T extends NamedStyles<T>>(
  stylesOrCreator: T | Creator<T>,
) {
  const creator: Creator<T> =
    typeof stylesOrCreator === 'function'
      ? stylesOrCreator
      : (theme: Theme) => {
          /**
           * The theme argument is unused when callers pass a static object,
           * but we still accept it to satisfy the Creator signature.
           */
          void theme;
          return stylesOrCreator;
        };

  const useStyles = () => {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(creator(theme)), [theme]);
  };

  return useStyles;
}
