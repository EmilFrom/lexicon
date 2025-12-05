import React, { useState } from 'react';
import {
    View,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

import { Text, Icon, Avatar } from '../../../core-ui';
import { useSearchUsers } from '../../../hooks';
import { makeStyles, useTheme } from '../../../theme';
import { UserIcon } from '../../../types/api/user';

type Props = {
    onSelectUser: (user: UserIcon) => void;
    selectedUserIds: number[];
    placeholder?: string;
};

export function UserSearchAutocomplete({
    onSelectUser,
    selectedUserIds,
    placeholder = t('Search users...'),
}: Props) {
    const styles = useStyles();
    const { colors } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    const { data, loading } = useSearchUsers({
        variables: { search: searchTerm },
        skip: searchTerm.length < 2,
    });

    const users = data?.searchUser?.users || [];

    const handleSearchChange = useDebouncedCallback((text: string) => {
        setSearchTerm(text);
    }, 300);

    const renderUserItem = ({ item }: { item: UserIcon }) => {
        const isSelected = selectedUserIds.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.userItem, isSelected && styles.userItemSelected]}
                onPress={() => onSelectUser(item)}
                disabled={isSelected}
            >
                <Avatar
                    src={item.avatar}
                    size="m"
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text variant="semiBold">{item.name || item.username}</Text>
                    <Text size="s" style={styles.username}>
                        @{item.username}
                    </Text>
                </View>
                {isSelected && (
                    <Icon name="CheckCircle" size="m" color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
                <Icon name="Search" size="m" color={colors.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textLight}
                    onChangeText={handleSearchChange}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {loading && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Results List */}
            {searchTerm.length >= 2 && (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.resultsList}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>
                                    {t('No users found')}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Helper Text */}
            {searchTerm.length < 2 && (
                <View style={styles.helperContainer}>
                    <Text style={styles.helperText}>
                        {t('Type at least 2 characters to search')}
                    </Text>
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
    container: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundDarker,
        borderRadius: 8,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        marginBottom: spacing.l,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.s,
        fontSize: 16,
        color: colors.textNormal,
    },
    resultsList: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s,
        borderRadius: 8,
    },
    userItemSelected: {
        backgroundColor: colors.backgroundDarker,
        opacity: 0.5,
    },
    avatar: {
        marginRight: spacing.m,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        color: colors.textLight,
        marginTop: 2,
    },
    emptyState: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
    },
    helperContainer: {
        paddingVertical: spacing.l,
        alignItems: 'center',
    },
    helperText: {
        color: colors.textLight,
        fontSize: 14,
    },
}));
