import { ChatMessageContent } from '../types/Types';

export type MessageGroupInfo = {
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    showAvatar: boolean;
    showTimestamp: boolean;
    timeSinceLastMessage: number; // in seconds
};

const TIME_GAP_THRESHOLD = 60; // seconds - messages within this gap are grouped

/**
 * Determines grouping information for a chat message based on its position
 * in the message list and relationship to surrounding messages.
 *
 * @param messages - Array of all chat messages
 * @param currentIndex - Index of the current message in the array
 * @param currentUserId - ID of the currently logged-in user
 * @param inverted - Whether the list is inverted (newest at bottom)
 * @returns MessageGroupInfo object with grouping details
 */
export function getMessageGroupInfo(
    messages: ChatMessageContent[],
    currentIndex: number,
    currentUserId: number,
    inverted: boolean = true
): MessageGroupInfo {
    const currentMessage = messages[currentIndex];

    // When inverted, previous message is at higher index, next is at lower index
    const prevIndex = inverted ? currentIndex + 1 : currentIndex - 1;
    const nextIndex = inverted ? currentIndex - 1 : currentIndex + 1;

    const prevMessage = messages[prevIndex];
    const nextMessage = messages[nextIndex];

    const currentTime = new Date(currentMessage.time).getTime();
    const currentUserId_msg = currentMessage.user.id;

    // Calculate time since last message
    let timeSinceLastMessage = 0;
    if (prevMessage) {
        const prevTime = new Date(prevMessage.time).getTime();
        timeSinceLastMessage = Math.abs(currentTime - prevTime) / 1000; // Convert to seconds
    }

    // Check if previous message is from same user and within time threshold
    const isPrevFromSameUser =
        prevMessage &&
        prevMessage.user.id === currentUserId_msg &&
        timeSinceLastMessage <= TIME_GAP_THRESHOLD;

    // Check if next message is from same user
    let isNextFromSameUser = false;
    if (nextMessage) {
        const nextTime = new Date(nextMessage.time).getTime();
        const timeSinceNextMessage = Math.abs(nextTime - currentTime) / 1000;
        isNextFromSameUser =
            nextMessage.user.id === currentUserId_msg &&
            timeSinceNextMessage <= TIME_GAP_THRESHOLD;
    }

    // Determine position in group
    const isFirstInGroup = !isPrevFromSameUser;
    const isLastInGroup = !isNextFromSameUser;

    // Show avatar only on first message in group (for received messages)
    // For sent messages (current user), we typically don't show avatar
    const isCurrentUser = currentUserId_msg === currentUserId;
    const showAvatar = isFirstInGroup && !isCurrentUser;

    // Show timestamp on first message in group or when there's a significant time gap
    const showTimestamp = isFirstInGroup || timeSinceLastMessage > TIME_GAP_THRESHOLD;

    return {
        isFirstInGroup,
        isLastInGroup,
        showAvatar,
        showTimestamp,
        timeSinceLastMessage,
    };
}

/**
 * Helper function to determine if a message is from the current user
 */
export function isMessageFromCurrentUser(
    message: ChatMessageContent,
    currentUserId: number
): boolean {
    return message.user.id === currentUserId;
}
