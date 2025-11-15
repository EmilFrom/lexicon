import React from 'react';
import { Switch, View } from 'react-native';

import { ActionSheet } from '../../../components';
import { Text } from '../../../core-ui';
import { Icon } from '../../../icons';
import { t } from '../../../i18n/translate';
import { makeStyles } from '../../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  isPushEnabled: boolean;
  onTogglePush: (newValue: boolean) => void;
  channelTitle: string;
};

export function ChannelSettingsMenu(props: Props) {
  const styles = useStyles();
  const { visible, onClose, isPushEnabled, onTogglePush, channelTitle } = props;

  return (
    <ActionSheet visible={visible} onClose={onClose} title={channelTitle}>
      <View style={styles.container}>
        <View style={styles.row}>
          <Icon name="Bell" size="l" />
          <Text style={styles.label}>{t('Push Notifications')}</Text>
          <Switch value={isPushEnabled} onValueChange={onTogglePush} />
        </View>
      </View>
    </ActionSheet>
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    padding: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginHorizontal: spacing.l,
  },
}));
