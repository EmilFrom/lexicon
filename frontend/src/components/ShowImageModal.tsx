import React from 'react';
import { Modal, TouchableOpacity, View, Image } from 'react-native';

import { Text } from '../core-ui/Text';
import { makeStyles } from '../theme';

type Props = {
  show: boolean;
  userImage: { uri?: string };
  onPressCancel: () => void;
};

export function ShowImageModal(props: Props) {
  const styles = useStyles();

  const { show, userImage, onPressCancel } = props;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={show}
      onRequestClose={onPressCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.imageWrapper}>
          {userImage.uri && (
            <Image
              source={{ uri: userImage.uri }}
              style={styles.imageDetail}
              resizeMode="contain"
            />
          )}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPressCancel}
          style={styles.closeButton}
        >
          <Text variant="semibold" size="s" color="textLight">
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: spacing.l,
  },
  imageWrapper: {
    width: '100%',
    maxHeight: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  imageDetail: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.l,
    right: spacing.l,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 999,
  },
}));
