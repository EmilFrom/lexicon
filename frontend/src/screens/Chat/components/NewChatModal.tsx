import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';

import { Text, Icon } from '../../../core-ui';
import { makeStyles, useTheme } from '../../../theme';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function NewChatModal({ visible, onClose }: Props) {
    const styles = useStyles();
    const { colors } = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                    <Text variant="semiBold" size="l">
                        {t('New Chat')}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Content - placeholder for now */}
                <View style={styles.content}>
                    <Text style={styles.placeholderText}>
                        User search will go here
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.l,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    cancelButton: {
        paddingVertical: spacing.s,
    },
    cancelText: {
        color: colors.primary,
        fontSize: 16,
    },
    placeholder: {
        width: 60, // Same width as cancel button for centering
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },
    placeholderText: {
        color: colors.textLight,
        textAlign: 'center',
        marginTop: spacing.xxl,
    },
}));
