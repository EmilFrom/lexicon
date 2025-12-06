import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Text, Icon } from '../../../core-ui';
import { useCreateDirectMessageChannel } from '../../../hooks';
import { makeStyles, useTheme } from '../../../theme';
import { StackNavProp } from '../../../types';
import { UserSearchAutocomplete } from './UserSearchAutocomplete';

type SearchUser = {
    id: number;
    username: string;
    avatar: string;
    name?: string | null;
};

type Props = {
    visible: boolean;
    onClose: () => void;
};

export function NewChatModal({ visible, onClose }: Props) {
    const styles = useStyles();
    const { colors } = useTheme();
    const navigation = useNavigation<StackNavProp<'TabNav'>>();
    const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
    const [groupName, setGroupName] = useState('');

    const { createDirectMessageChannel, loading } = useCreateDirectMessageChannel();

    const isGroupChat = selectedUsers.length >= 2; // 2+ users = group chat
    const canCreate = selectedUsers.length > 0;

    const handleSelectUser = (user: SearchUser) => {
        if (!selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleRemoveUser = (userId: number) => {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
    };

    const handleClose = () => {
        setSelectedUsers([]);
        setGroupName('');
        onClose();
    };

    const handleCreate = async () => {
        if (!canCreate || loading) return;

        try {
            const channel = await createDirectMessageChannel({
                usernames: selectedUsers.map((u) => u.username),
                name: isGroupChat && groupName ? groupName : undefined,
            });

            if (channel) {
                // Navigate to the new channel
                navigation.navigate('ChatChannelDetail', {
                    channelId: channel.id,
                    channelTitle: channel.title,
                    lastMessageId: channel.lastMessageId || undefined,
                    memberCount: channel.membershipsCount,
                    threadEnabled: channel.threadingEnabled,
                });
                handleClose();
            }
        } catch (error) {
            console.error('Failed to create channel:', error);
            // Error handling will be shown by the hook
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                    <Text variant="semiBold" size="l">
                        {t('New Chat')}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Selected Users Chips */}
                    {selectedUsers.length > 0 && (
                        <View style={styles.selectedContainer}>
                            <Text size="s" style={styles.selectedLabel}>
                                {t('Selected')} ({selectedUsers.length}):
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.chipsScroll}
                            >
                                {selectedUsers.map((user) => (
                                    <View key={user.id} style={styles.chip}>
                                        <Text size="s" style={styles.chipText}>
                                            {user.name || user.username}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveUser(user.id)}
                                            style={styles.chipRemove}
                                        >
                                            <Icon name="Cancel" size="xs" color={colors.textLight} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* User Search */}
                    <UserSearchAutocomplete
                        onSelectUser={handleSelectUser}
                        selectedUserIds={selectedUsers.map((u) => u.id)}
                    />

                    {/* Group Name Input (for 2+ users) */}
                    {isGroupChat && (
                        <View style={styles.groupNameContainer}>
                            <Text size="s" style={styles.groupNameLabel}>
                                {t('Group Name')} ({t('Optional')}):
                            </Text>
                            <TextInput
                                style={styles.groupNameInput}
                                placeholder={t('Enter group name...')}
                                placeholderTextColor={colors.textLight}
                                value={groupName}
                                onChangeText={setGroupName}
                                maxLength={50}
                            />
                        </View>
                    )}

                    {/* Create Button */}
                    <TouchableOpacity
                        style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
                        onPress={handleCreate}
                        disabled={!canCreate || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.pureWhite} />
                        ) : (
                            <Text variant="semiBold" style={styles.createButtonText}>
                                {t('Create Chat')}
                            </Text>
                        )}
                    </TouchableOpacity>
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
        width: 60,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.l,
    },
    selectedContainer: {
        marginBottom: spacing.l,
    },
    selectedLabel: {
        color: colors.textLight,
        marginBottom: spacing.s,
    },
    chipsScroll: {
        flexGrow: 0,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundDarker,
        borderRadius: 16,
        paddingVertical: spacing.xs,
        paddingLeft: spacing.m,
        paddingRight: spacing.xs,
        marginRight: spacing.s,
    },
    chipText: {
        marginRight: spacing.xs,
    },
    chipRemove: {
        padding: spacing.xs,
    },
    groupNameContainer: {
        marginTop: spacing.l,
        marginBottom: spacing.l,
    },
    groupNameLabel: {
        color: colors.textLight,
        marginBottom: spacing.s,
    },
    groupNameInput: {
        backgroundColor: colors.backgroundDarker,
        borderRadius: 8,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
        fontSize: 16,
        color: colors.textNormal,
    },
    createButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: spacing.m,
        alignItems: 'center',
        marginTop: spacing.l,
    },
    createButtonDisabled: {
        backgroundColor: colors.textLight,
        opacity: 0.5,
    },
    createButtonText: {
        color: colors.pureWhite,
        fontSize: 16,
    },
}));
