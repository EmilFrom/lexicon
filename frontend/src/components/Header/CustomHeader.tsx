import { HeaderBackButton } from '@react-navigation/elements';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import React, { useLayoutEffect } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import { ActivityIndicator, Text } from '../../core-ui';
import { IconName } from '../../icons';
import { Color, makeStyles, useColorScheme, useTheme } from '../../theme';
import { TabNavProp } from '../../types';

import { HeaderItem } from './HeaderItem';

type Props = {
  title?: string;
  subtitle?: string;
  color?: Color;
  noShadow?: boolean;
  rightTitle?: string;
  rightIcon?: IconName;
  onPressRight?: () => void;
  onPressTitle?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  prevScreen?: string;
  hideHeaderLeft?: boolean;
};

export function CustomHeader(props: Props) {
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation<TabNavProp<'Home'>>();
  const styles = useStyles();
  const { colors, fontSizes, navHeader } = useTheme();

  const {
    title,
    subtitle,
    color = 'background',
    rightTitle = '',
    rightIcon,
    onPressRight,
    onPressTitle,
    noShadow = false,
    disabled = false,
    isLoading = false,
    prevScreen,
    hideHeaderLeft = false,
  } = props;

  const statusBarStyle: StatusBarStyle =
    colorScheme === 'light' ? 'dark' : 'light';

  const headerRight = React.useMemo(() => {
    if (isLoading) {
      return <ActivityIndicator style={styles.headerRight} />;
    }

    if (!onPressRight) {
      return null;
    }

    return (
      <HeaderItem
        label={rightTitle}
        icon={rightIcon}
        onPressItem={onPressRight}
        disabled={disabled}
        style={styles.headerRight}
      />
    );
  }, [isLoading, onPressRight, disabled, rightTitle, rightIcon, styles]);

  const routesLength = useNavigationState((state) => state.routes.length);

  const headerLeft = React.useMemo(() => {
    if (routesLength < 2) {
      return null;
    }

    return (
      <HeaderBackButton
        label="Back"
        labelVisible={Platform.OS === 'ios'}
        tintColor={isLoading ? colors.grey : colors.primary}
        style={isLoading && { opacity: 0.5 }}
        labelStyle={[
          {
            color: isLoading ? colors.grey : colors.primary,
            fontSize: fontSizes.m,
          },
        ]}
        disabled={isLoading}
        onPress={() => {
          if (prevScreen) {
            // TODO: Fix this type error more properly when there's time
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            navigation.navigate(prevScreen, { backToTop: false });
            return;
          }

          navigation.goBack();
        }}
        testID="HeaderBackButton"
      />
    );
  }, [routesLength, isLoading, navigation, prevScreen, colors, fontSizes]);

  const headerTitle = React.useMemo(() => {
    const titleContent = (
      <View style={styles.headerTitle}>
        <Text size="l" variant="semiBold">
          {title}
        </Text>
        {subtitle ? (
          <Text size="xs" color="lightTextDarker" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );

    if (onPressTitle) {
      return (
        <TouchableOpacity onPress={onPressTitle}>{titleContent}</TouchableOpacity>
      );
    }

    return titleContent;
  }, [styles, title, subtitle, onPressTitle]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...navHeader,
      headerStyle: {
        backgroundColor: colors[color],
        ...(noShadow && { shadowOpacity: 0, elevation: 0 }),
      },
      headerTitle: () => headerTitle,
      headerLeft: () => (!hideHeaderLeft ? headerLeft : undefined),
      headerRight: () => headerRight,
    });
  }, [
    color,
    colors,
    headerLeft,
    headerRight,
    headerTitle,
    hideHeaderLeft,
    navHeader,
    navigation,
    noShadow,
    title,
  ]);

  return <StatusBar style={statusBarStyle} />;
}

const useStyles = makeStyles(({ spacing }) => ({
  headerRight: {
    paddingRight: spacing.xxl,
  },
  headerTitle: { alignItems: 'center' },
  subtitle: { marginBottom: spacing.m, marginTop: spacing.xs },
}));
