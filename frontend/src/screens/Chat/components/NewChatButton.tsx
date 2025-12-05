import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';

import { Icon } from '../../../core-ui';
import { makeStyles, useTheme } from '../../../theme';

type Props = {
    onPress: () => void;
    testID?: string;
};

export function NewChatButton({ onPress, testID }: Props) {
    const styles = useStyles();
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={styles.fab}
            onPress={onPress}
            testID={testID}
            activeOpacity={0.8}
        >
            <Icon name="Add" size="l" color={colors.pureWhite} />
        </TouchableOpacity>
    );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
    fab: {
        position: 'absolute',
        bottom: spacing.xxl,
        right: spacing.xxl,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8, // Android shadow
        shadowColor: colors.shadow, // iOS shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
}));
