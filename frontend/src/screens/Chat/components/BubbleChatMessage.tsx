import React, { Fragment, useState, useMemo } from 'react';
import { View, StyleSheet, Animated, Pressable } from 'react-native';

import { MarkdownRenderer } from '../../../components/MarkdownRenderer';
import { ImageCarousel } from '../../../components/ImageCarousel';
import { FullScreenImageModal } from '../../../components/FullScreenImageModal';
import { MetricItem } from '../../../components/Metrics/MetricItem';
import { Avatar, Icon, Text } from '../../../core-ui';
import {
    automaticFontColor,
    filterMarkdownContentPoll,
    formatTime,
    getImage,
    handleUnsupportedMarkdown,
} from '../../../helpers';
import { getCompleteImageVideoUrls } from '../../../helpers/api/processRawContent';
import { makeStyles, useTheme } from '../../../theme';
import { ChatMessageContent, User } from '../../../types';
import { useImageDimensions } from '../../../hooks/useImageDimensions';
import { discourseHost } from '../../../constants';
import { markdownToHtml } from '../../../helpers/markdownToHtml';
import { MessageTail } from './MessageTail';
import { LinearGradient } from 'expo-linear-gradient';

type BubbleChatMessageProps = {
    content: ChatMessageContent;
    sender: User;
    isCurrentUser: boolean;
    showAvatar: boolean;
    showTimestamp: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    onPressAvatar?: () => void;
    onPressReplies?: () => void;
    hideReplies?: boolean;
    isLoading?: boolean;
    testID?: string;
};

/**
 * BubbleChatMessage - A modern chat bubble component for messages
 * Supports sent/received styling, grouping, images, markdown, and threads
 */
export const BubbleChatMessage: React.FC<BubbleChatMessageProps> = React.memo((props) => {
    const styles = useStyles();
    const { colors, spacing } = useTheme();
    const {
        content,
        sender,
        isCurrentUser,
        showAvatar,
        showTimestamp,
        isFirstInGroup,
        isLastInGroup,
        onPressAvatar,
        onPressReplies,
        hideReplies,
        isLoading,
        testID,
    } = props;

    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [showTimestampOverlay, setShowTimestampOverlay] = useState(false);

    const { id, time, markdownContent } = content;

    // 1. Extract Polls from Markdown
    const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');

    // 2. Convert Markdown to HTML
    const htmlContent = useMemo(
        () => markdownToHtml(filteredMarkdown),
        [filteredMarkdown],
    );

    // 3. COMBINE IMAGES (HTML + Uploads Array)
    const images = useMemo(() => {
        const markdownImages =
            (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[]) ||
            [];

        const uploads = content.uploads || [];
        const uploadImages = uploads
            .filter((u) => {
                const allowedExtensions = [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'webp',
                    'heic',
                    'heif',
                ];
                if (
                    u.extension &&
                    allowedExtensions.includes(u.extension.toLowerCase())
                )
                    return true;
                if (u.url && u.url.match(/\.(jpeg|jpg|gif|png|webp|heic|heif)($|\?)/i))
                    return true;
                return false;
            })
            .map((u) => {
                if (u.url.startsWith('http')) return u.url;
                if (u.url.startsWith('//')) return `https:${u.url}`;
                return `${discourseHost}${u.url}`;
            });

        return Array.from(new Set([...markdownImages, ...uploadImages]));
    }, [htmlContent, content]);

    // 4. Fetch Dimensions
    const { dimensions } = useImageDimensions(images);

    // 5. Prepare Text Content (Strip images from HTML)
    const imageTagRegex = /<img[^>]*>/g;
    const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
    const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

    // 6. Unsupported Logic
    const unsupported = content.uploads?.some((u) => {
        let fullUrl = u.url;
        if (fullUrl.startsWith('//')) fullUrl = `https:${fullUrl}`;
        else if (!fullUrl.startsWith('http'))
            fullUrl = `${discourseHost}${fullUrl}`;
        return !images.includes(fullUrl);
    }) || false;

    // Determine bubble styling based on position in group
    const getBubbleStyle = () => {
        const baseRadius = 18;
        const minRadius = 4;

        if (isFirstInGroup && isLastInGroup) {
            // Single message - all corners rounded
            return { borderRadius: baseRadius };
        }

        if (isCurrentUser) {
            // Sent messages (right side)
            if (isFirstInGroup) {
                return {
                    borderTopLeftRadius: baseRadius,
                    borderTopRightRadius: baseRadius,
                    borderBottomLeftRadius: baseRadius,
                    borderBottomRightRadius: minRadius,
                };
            } else if (isLastInGroup) {
                return {
                    borderTopLeftRadius: baseRadius,
                    borderTopRightRadius: minRadius,
                    borderBottomLeftRadius: baseRadius,
                    borderBottomRightRadius: baseRadius,
                };
            } else {
                return {
                    borderTopLeftRadius: baseRadius,
                    borderTopRightRadius: minRadius,
                    borderBottomLeftRadius: baseRadius,
                    borderBottomRightRadius: minRadius,
                };
            }
        } else {
            // Received messages (left side)
            if (isFirstInGroup) {
                return {
                    borderTopLeftRadius: baseRadius,
                    borderTopRightRadius: baseRadius,
                    borderBottomLeftRadius: minRadius,
                    borderBottomRightRadius: baseRadius,
                };
            } else if (isLastInGroup) {
                return {
                    borderTopLeftRadius: minRadius,
                    borderTopRightRadius: baseRadius,
                    borderBottomLeftRadius: baseRadius,
                    borderBottomRightRadius: baseRadius,
                };
            } else {
                return {
                    borderTopLeftRadius: minRadius,
                    borderTopRightRadius: baseRadius,
                    borderBottomLeftRadius: minRadius,
                    borderBottomRightRadius: baseRadius,
                };
            }
        }
    };

    const bubbleBackgroundColor = isCurrentUser
        ? colors.chatBubbleSent
        : colors.chatBubbleReceived;

    const bubbleTextColor = isCurrentUser
        ? colors.chatBubbleSentText
        : colors.chatBubbleReceivedText;

    // Gradient colors for sent messages (very subtle)
    const gradientColors = isCurrentUser
        ? ([colors.chatBubbleSent, `${colors.chatBubbleSent}E6`] as const) // 90% opacity for subtle effect
        : ([bubbleBackgroundColor, bubbleBackgroundColor] as const); // No gradient for received

    const renderUnsupported = () => (
        <View style={styles.unsupported}>
            <Icon
                name="Information"
                size="xl"
                color={isCurrentUser ? colors.chatBubbleSentText : colors.textLighter}
                style={styles.unsupportedIcon}
            />
            <Text
                size="xs"
                style={[
                    styles.unsupportedText,
                    { color: isCurrentUser ? colors.chatBubbleSentText : colors.textLight }
                ]}
            >
                {t('Unsupported file type.')}
            </Text>
            <Text
                size="xs"
                style={[
                    styles.unsupportedText,
                    { color: isCurrentUser ? colors.chatBubbleSentText : colors.textLight }
                ]}
            >
                {t('To open, please visit Discourse web.')}
            </Text>
        </View>
    );

    const renderMessageContent = () => (
        <>
            {markdownContentScene && (
                <MarkdownRenderer
                    fontColor={bubbleTextColor}
                    content={markdownContentScene}
                    fontSize={18}
                />
            )}
            {images.length > 0 && (
                <View style={styles.imageContainer}>
                    <ImageCarousel
                        images={images}
                        onImagePress={(uri) => setFullScreenImage(uri)}
                        imageDimensionsMap={dimensions}
                        maxHeight={250}
                    />
                </View>
            )}
            {unsupported && renderUnsupported()}
        </>
    );

    // Don't render if no content
    if (!markdownContentScene && images.length === 0 && !unsupported) {
        return null;
    }

    // Calculate dynamic spacing based on message grouping
    // Single message: 8px spacing
    // First in group: 8px top, 1px bottom
    // Middle in group: 1px both sides
    // Last in group: 1px top, 8px bottom
    const getContainerSpacing = () => {
        if (isFirstInGroup && isLastInGroup) {
            // Single message - normal spacing
            return { marginVertical: spacing.m }; // 8px
        }
        if (isFirstInGroup) {
            // First in group - spacing above, minimal below
            return { marginTop: spacing.m, marginBottom: 1 };
        }
        if (isLastInGroup) {
            // Last in group - minimal above, spacing below
            return { marginTop: 1, marginBottom: spacing.m };
        }
        // Middle of group - minimal spacing
        return { marginVertical: 1 };
    };

    return (
        <View style={[styles.container, getContainerSpacing()]} testID={testID}>
            <View
                style={[
                    styles.messageRow,
                    isCurrentUser ? styles.messageRowSent : styles.messageRowReceived,
                ]}
            >
                {/* Avatar for received messages */}
                {!isCurrentUser && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                            <Avatar
                                src={getImage(sender.avatar)}
                                onPress={onPressAvatar}
                                size="xs"
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder} />
                        )}
                    </View>
                )}

                {/* Message bubble */}
                <View
                    style={[
                        styles.bubbleContainer,
                        isCurrentUser ? styles.bubbleContainerSent : styles.bubbleContainerReceived,
                    ]}
                >
                    {/* Sender name and timestamp (for received messages, first in group) */}
                    {!isCurrentUser && showAvatar && (
                        <Text color="textLight" size="xs" style={styles.senderName}>
                            {sender?.username}
                        </Text>
                    )}

                    {/* Bubble with content - wrapped in Pressable for long-press */}
                    <Pressable
                        onLongPress={() => setShowTimestampOverlay(true)}
                        onPressOut={() => setTimeout(() => setShowTimestampOverlay(false), 2000)}
                        delayLongPress={500}
                    >
                        <LinearGradient
                            colors={gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.bubble,
                                getBubbleStyle(),
                            ]}
                        >
                            {renderMessageContent()}

                            {/* Show tail on last message in group */}
                            {isLastInGroup && (
                                <MessageTail
                                    color={bubbleBackgroundColor}
                                    side={isCurrentUser ? 'right' : 'left'}
                                    size={8}
                                />
                            )}
                        </LinearGradient>

                        {/* Timestamp overlay - shows on long-press */}
                        {showTimestampOverlay && (
                            <View style={styles.timestampOverlay}>
                                <Text size="xs" style={styles.timestampOverlayText}>
                                    {formatTime({ dateString: time, hour12: true })}
                                </Text>
                            </View>
                        )}
                    </Pressable>

                    {/* Timestamp - Hidden by default, shown on long-press via overlay */}
                    {/* {showTimestamp && (
                        <Text
                            size="xs"
                            style={[
                                styles.timestamp,
                                isCurrentUser ? styles.timestampSent : styles.timestampReceived,
                            ]}
                            color="textLight"
                        >
                            {formatTime({ dateString: time, hour12: true })}
                        </Text>
                    )} */}

                    {/* Thread replies button */}
                    {!hideReplies &&
                        content.replyCount != null &&
                        content.replyCount !== undefined &&
                        content.replyCount > 0 && (
                            <View
                                style={[
                                    styles.threadButton,
                                    isCurrentUser
                                        ? styles.threadButtonSent
                                        : styles.threadButtonReceived,
                                ]}
                            >
                                <MetricItem
                                    type="Thread"
                                    count={content.replyCount}
                                    fontStyle={styles.metric}
                                    onPress={onPressReplies}
                                    testID={`Chat:BubbleChatMessage:Thread:${id}`}
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                />
                            </View>
                        )}
                </View>
            </View>

            <FullScreenImageModal
                visible={!!fullScreenImage}
                imageUri={fullScreenImage || ''}
                onClose={() => setFullScreenImage(null)}
            />
        </View>
    );
});

BubbleChatMessage.displayName = 'BubbleChatMessage';

const useStyles = makeStyles(({ spacing, colors }) => ({
    container: {
        // Spacing applied dynamically based on grouping
    },
    messageRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.m,
    },
    messageRowSent: {
        justifyContent: 'flex-end',
    },
    messageRowReceived: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 32,
        marginRight: spacing.s,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
    },
    bubbleContainer: {
        maxWidth: '75%',
    },
    bubbleContainerSent: {
        alignItems: 'flex-end',
    },
    bubbleContainerReceived: {
        alignItems: 'flex-start',
    },
    senderName: {
        marginBottom: spacing.xs,
        marginLeft: spacing.s,
    },
    bubble: {
        paddingHorizontal: 12, // Increased to 12px for 18px font
        paddingVertical: 8, // Increased to 8px for 18px font
        position: 'relative',
        // Very subtle shadow for depth
        shadowColor: colors.shadow,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05, // Very subtle - only 5% opacity
        shadowRadius: 2,
        elevation: 1, // Android
    },
    timestamp: {
        marginTop: spacing.xs,
        marginHorizontal: spacing.s,
    },
    timestampSent: {
        textAlign: 'right',
    },
    timestampReceived: {
        textAlign: 'left',
    },
    threadButton: {
        borderWidth: 1,
        borderColor: colors.border,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingHorizontal: spacing.m,
        flexDirection: 'row',
        marginTop: spacing.xs,
    },
    threadButtonSent: {
        alignSelf: 'flex-end',
    },
    threadButtonReceived: {
        alignSelf: 'flex-start',
    },
    metric: {
        flexGrow: 0,
    },
    unsupported: {
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 80,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s,
        marginTop: spacing.xs,
    },
    unsupportedIcon: {
        marginBottom: spacing.xs,
    },
    unsupportedText: {
        textAlign: 'center',
    },
    imageContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: spacing.xs,
        borderWidth: 0, // Explicitly remove any borders
    },
    timestampOverlay: {
        position: 'absolute',
        top: -28,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 12,
        zIndex: 1000,
    },
    timestampOverlayText: {
        color: colors.pureWhite,
        fontSize: 11,
    },
}));
