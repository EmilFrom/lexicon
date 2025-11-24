import React, { useState, PropsWithChildren } from 'react';
import { View, TouchableOpacity } from 'react-native';
// --- FIX START ---
// Import directly from the file to break the cycle (Collapsible -> core-ui -> ChatBubble -> MarkdownRenderer -> Collapsible)
import { Icon } from '../core-ui/Icon';
import { Text } from '../core-ui/Text';
// REMOVED: import { Icon, Text } from '../core-ui';
// --- FIX END ---
import { makeStyles, useTheme } from '../theme';

type Props = {
  title: string;
};

export function Collapsible({ title, children }: PropsWithChildren<Props>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
        <View style={styles.titleContainer}>
          <Text variant="bold" style={styles.flex}>
            {title}
          </Text>
          <Icon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            color={colors.textLighter}
          />
        </View>
      </TouchableOpacity>
      {isOpen && <View style={styles.contentContainer}>{children}</View>}
    </View>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  flex: { flex: 1 },
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.m,
    overflow: 'hidden',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.l,
    backgroundColor: colors.backgroundDarker,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
}));
