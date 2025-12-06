import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../core-ui';
import { useTheme } from '../../theme';
import { ChannelsScreen } from './Channels';
import { DirectMessagesScreen } from './DirectMessages';

const Tab = createMaterialTopTabNavigator();

function CustomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.title !== undefined
                    ? options.title
                    : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={index}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: 16, // Increased padding
                            borderBottomWidth: 3, // Thicker indicator
                            borderBottomColor: isFocused ? colors.primary : 'transparent'
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon
                                name={route.name === 'Channels' ? 'ChatBubble' : 'Mail'}
                                size="m"
                                color={isFocused ? colors.primary : colors.textLight}
                            />
                            <Text style={{
                                marginLeft: 8,
                                color: isFocused ? colors.primary : colors.textLight,
                                fontWeight: 'bold',
                                fontSize: 14 // Slightly larger text
                            }}>
                                {label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export function MessagesScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Tab.Navigator
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={{
                    tabBarStyle: { backgroundColor: colors.background },
                }}
            >
                <Tab.Screen
                    name="Channels"
                    component={ChannelsScreen}
                    options={{ title: 'Channels' }}
                />
                <Tab.Screen
                    name="DirectMessages"
                    component={DirectMessagesScreen}
                    options={{ title: 'Direct Messages' }}
                />
            </Tab.Navigator>
        </SafeAreaView>
    );
}
