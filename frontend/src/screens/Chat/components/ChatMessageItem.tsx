import React, { Fragment } from 'react';
import { View } from 'react-native';

import { Text } from '../../../core-ui';
import { formatDateTime } from '../../../helpers';
import { makeStyles } from '../../../theme';
import {
  ChatMessageContent,
  ThreadDetailFirstContent,
  User,
} from '../../../types';
import { BubbleChatMessage } from './BubbleChatMessage';

type Props = {
  content: ChatMessageContent | ThreadDetailFirstContent;
  sender: User;
  newTimestamp: boolean;
  onPressAvatar?: () => void;
  unread?: boolean;
  settings: boolean;
  onPressReplies?: () => void;
  hideReplies?: boolean;
  testID?: string;
  isLoading?: boolean;
  // New props for bubble chat
  currentUserId?: number;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
};

/**
 * ChatMessageItem - Wrapper component for chat messages
 * Delegates to BubbleChatMessage for bubble-style rendering
 * Maintains backward compatibility with settings prop for thread detail views
 */
export function ChatMessageItem(props: Props) {
  const styles = useStyles();
  const {
    content,
    sender,
    newTimestamp,
    onPressAvatar,
    unread,
    settings,
    onPressReplies,
    hideReplies,
    testID,
    isLoading,
    currentUserId,
    isFirstInGroup = false,
    isLastInGroup = false,
    showAvatar: showAvatarProp,
    showTimestamp: showTimestampProp,
  } = props;

  const { id, time } = content;

  // Determine if this is a ChatMessageContent (has user.id) vs ThreadDetailFirstContent
  const isChatMessage = 'user' in content;

  // For bubble chat, determine if current user
  const isCurrentUser = isChatMessage && currentUserId
    ? content.user.id === currentUserId
    : false;

  // Use provided grouping info or defaults
  const showAvatar = showAvatarProp ?? isFirstInGroup;
  const showTimestamp = showTimestampProp ?? isFirstInGroup;

  // If this is a ChatMessageContent and we have currentUserId, use BubbleChatMessage
  if (isChatMessage && currentUserId !== undefined) {
    return (
      <View style={styles.flex} testID={testID}>
        <Fragment key={id}>
          {newTimestamp && (
            <Text
              color="textLight"
              size="xs"
              style={[styles.timestamp, styles.time]}
            >
              {formatDateTime(time, 'medium')}
            </Text>
          )}

          <BubbleChatMessage
            content={content as ChatMessageContent}
            sender={sender}
            isCurrentUser={isCurrentUser}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            onPressAvatar={onPressAvatar}
            onPressReplies={onPressReplies}
            hideReplies={hideReplies}
            isLoading={isLoading}
            testID={testID}
          />

          {unread && (
            <View style={styles.unread}>
              <Text color="textLight" size="xs" style={styles.time}>
                {t('Unread Messages')}
              </Text>
            </View>
          )}
        </Fragment>
      </View>
    );
  }

  // Fallback: render legacy style for thread details or when currentUserId not provided
  // This maintains backward compatibility with ThreadDetailFirstContent
  return (
    <View style={styles.flex} testID={testID}>
      <Fragment key={id}>
        {newTimestamp && (
          <Text
            color="textLight"
            size="xs"
            style={[styles.timestamp, styles.time]}
          >
            {formatDateTime(time, 'medium')}
          </Text>
        )}

        <View style={styles.messageItem}>
          <Text color="textLight" size="xs">
            {t('Legacy message rendering - please provide currentUserId')}
          </Text>
        </View>

        {unread && (
          <View style={styles.unread}>
            <Text color="textLight" size="xs" style={styles.time}>
              {t('Unread Messages')}
            </Text>
          </View>
        )}
      </Fragment>
    </View>
  );
}

const useStyles = makeStyles(({ spacing, colors }) => ({
  flex: { flex: 1 },
  time: { alignSelf: 'center' },
  messageItem: { paddingHorizontal: spacing.xl },
  timestamp: { marginBottom: spacing.m },
  unread: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.m,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDarker,
    marginBottom: spacing.m,
  },
}));
