import React from 'react';
import {
  Modal,
  Switch,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Icon, Text } from '../../../core-ui';
import { t } from '../../../i18n/translate';
import { makeStyles, useTheme } from '../../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  isPushEnabled: boolean;
  onTogglePush: (newValue: boolean) => void;
  channelTitle: string;
};

export function ChannelSettingsMenu(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { visible, onClose, isPushEnabled, onTogglePush, channelTitle } = props;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text size="l" variant="semiBold">
                  {channelTitle}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="Close" size="m" color={colors.textLighter} />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <View style={styles.container}>
                <View style={styles.row}>
                  <Icon name="Notifications" size="l" />
                  <Text style={styles.label}>{t('Push Notifications')}</Text>
                  <Switch value={isPushEnabled} onValueChange={onTogglePush} />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  closeButton: {
    padding: spacing.s,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
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
