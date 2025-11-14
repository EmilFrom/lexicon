import React from 'react';
import * as Linking from 'expo-linking';

import { makeStyles } from '../theme';

import { Text } from './Text';

type Props = {
  url: string;
};

export const Link = ({ url }: Props) => {
  const styles = useStyles();
  return (
    <Text
      onPress={() => {
        Linking.openURL(url);
      }}
      style={styles.link}
    >
      {url}
    </Text>
  );
};

const useStyles = makeStyles(({ colors }) => ({
  link: {
    color: colors.activeTab,
  },
}));
