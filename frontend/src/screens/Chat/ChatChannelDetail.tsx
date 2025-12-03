import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  VirtualizedList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { client } from '../../api/client';
import {
  ActionSheet,
  ActionSheetProps,
  CustomHeader,
  FooterLoadingIndicator,
  LoadingOrError,
} from '../../components';
import { CHAT_CHANNEL_DETAIL_PAGE_SIZE } from '../../constants';
import { TextInputType } from '../../core-ui';
import {
  ChannelListFragment,
  ChannelListFragmentDoc,
  DirectionPagination,
} from '../../generatedAPI/server';
import {
  compareTime,
  errorHandlerAlert,
  fetchPaginatedMessages,
  shouldDisplayTimestamp,
  useStorage,
} from '../../helpers';
import { getMessageGroupInfo } from '../../helpers/chatMessageGrouping';
import {
  useChatChannelDetail,
  useChatChannelMessages,
  useCreateThread,
  useGetChatChannelNotificationPreference,
  useLeaveChannel,
  usePolling,
  useReplyChat,
  useUpdateChatChannelNotificationPreference,
} from '../../hooks';
import { t } from '../../i18n/translate';
import { makeStyles } from '../../theme';
import { ChatMessageContent, StackNavProp, StackRouteProp } from '../../types';
import { useDevice } from '../../utils';

import {
  ChatList,
  ChannelSettingsMenu,
  ChatMessageItem,
  FooterReplyChat,
} from './components';

type OnScrollInfo = {
  index: number;
  highestMeasuredFrameIndex: number;
  averageItemLength: number;
};

export default function ChatChannelDetail() {
  const styles = useStyles();

  const ios = Platform.OS === 'ios';
  const screen = Dimensions.get('screen');

  const {
    params: {
      lastMessageId,
      channelId,
      channelTitle,
      memberCount,
      threadEnabled,
      targetMessageId,
    },
  } = useRoute<StackRouteProp<'ChatChannelDetail'>>();

  const { navigate, goBack, addListener } =
    useNavigation<StackNavProp<'ChatChannelDetail'>>();
  const { isTabletLandscape, isTablet } = useDevice();

  const virtualListRef = useRef<VirtualizedList<ChatMessageContent>>(null);
  const messageRef = useRef<TextInputType>(null);
  const scrollPosition = useRef(0);
  const nextTargetMessageId = useRef<number>(0);

  const [message, setMessage] = useState('');
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [textInputFocused, setInputFocused] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [isInitialRequest, setIsInitialRequest] = useState(true);
  const [loadingMessageId, setLoadingMessageId] = useState<number | null>(null);
  const previousPushEnabled = useRef<boolean | null>(null);

  const {
    getChatChannelDetail,
    loading: chatChannelDetailLoading,
    data: chatChannelDetailData,
    error: chatChannelDetailError,
  } = useChatChannelDetail({});

  useEffect(() => {
    if (chatChannelDetailError) {
      errorHandlerAlert(chatChannelDetailError);
    }
  }, [chatChannelDetailError]);

  const {
    getChatChannelMessages,
    loading: channelMessagesLoading,
    fetchMore,
    refetch,
    data: messagesData,
  } = useChatChannelMessages({}, 'HIDE_ALERT');

  const messagesResult = messagesData?.getChatChannelMessages;
  // --- FIX: Memoize chatMessages ---
  const chatMessages = useMemo(
    () => messagesResult?.messages ?? [],
    [messagesResult],
  );
  const hasOlderMessages = messagesResult?.canLoadMorePast ?? true;
  const canLoadMoreFuture = messagesResult?.canLoadMoreFuture ?? false;

  // Get storage instance and current user ID for bubble chat
  const storage = useStorage();
  const currentUserId = storage.getItem('user')?.id;

  const shouldMaintainVisiblePosition = canLoadMoreFuture;

  const hasUnread =
    chatMessages.length > 0 && lastMessageId !== chatMessages[0].id;

  useEffect(() => {
    nextTargetMessageId.current = canLoadMoreFuture
      ? chatMessages[0]?.id ?? 0
      : 0;

    if (chatMessages.length && targetMessageId && isInitialRequest) {
      const targetMessage = chatMessages.find(
        (message) => message.id === targetMessageId,
      );
      if (targetMessage) {
        setTimeout(
          () =>
            virtualListRef.current?.scrollToItem({
              item: targetMessage,
            }),
          ios ? 50 : 150,
        );
      }
    }
  }, [chatMessages, canLoadMoreFuture, targetMessageId, isInitialRequest, ios]);

  const { preference, refetch: refetchPreference } =
    useGetChatChannelNotificationPreference(channelId);

  const isPushEnabled = preference ? preference.pushEnabled : true;

  const { updatePreference, loading: updatePreferenceLoading } =
    useUpdateChatChannelNotificationPreference();

  const { leaveChannel } = useLeaveChannel({
    onError: (error) => {
      errorHandlerAlert(error);
    },
    update: (cache, _, { variables }) => {
      cache.modify({
        id: `ChannelList:${variables?.channelId}`,
        fields: {
          isFollowingChannel: () => {
            return false;
          },
        },
      });
    },
    onCompleted: () => {
      goBack();
    },
  });

  const { replyChat, loading: replyLoading } = useReplyChat({
    onCompleted: async () => {
      setMessage('');

      try {
        client.cache.evict({ fieldName: 'getChatChannelMessages' });
        client.cache.gc();

        await refetch({
          channelId,
          pageSize: CHAT_CHANNEL_DETAIL_PAGE_SIZE,
          targetMessageId: undefined,
        });

        if (virtualListRef.current) {
          setTimeout(() => {
            virtualListRef.current?.scrollToOffset({
              offset: 0,
              animated: true,
            });
          }, 100);
        }
      } catch (error) {
        console.warn('Failed to refresh chat', error);
      }
    },
  });

  const { createThread } = useCreateThread({
    onCompleted: ({ createThread: { id, lastMessageId } }) => {
      setLoadingMessageId(null);
      navigateToThread(id, lastMessageId);
    },
  });

  const channelDetail = client.readFragment<ChannelListFragment>({
    fragment: ChannelListFragmentDoc,
    fragmentName: 'ChannelListFragment',
    id: `ChannelList:${String(channelId)}`,
  });

  useEffect(() => {
    const unsubscribe = addListener('focus', () => {
      if (
        (typeof memberCount !== 'number' ||
          typeof threadEnabled !== 'boolean' ||
          typeof channelTitle !== 'string') &&
        !channelDetail
      ) {
        getChatChannelDetail({
          variables: {
            channelId,
          },
        });
      }

      getChatChannelMessages({
        variables: {
          channelId,
          pageSize: CHAT_CHANNEL_DETAIL_PAGE_SIZE,
          targetMessageId,
        },
      });
    });

    return unsubscribe;
  }, [
    addListener,
    channelDetail,
    channelId,
    channelTitle,
    getChatChannelDetail,
    getChatChannelMessages,
    memberCount,
    targetMessageId,
    threadEnabled,
  ]);

  usePolling({
    fetchFn: () => {
      fetchMore({
        variables: {
          isPolling: true,
          channelId,
          pageSize: CHAT_CHANNEL_DETAIL_PAGE_SIZE,
          targetMessageId:
            nextTargetMessageId.current > 0
              ? nextTargetMessageId.current
              : undefined,
          direction:
            nextTargetMessageId.current > 0
              ? DirectionPagination.Future
              : undefined,
        },
      });
    },
    interval: 5000,
    shouldPoll: true,
  });

  const loadMoreMessages = async () => {
    if (isInitialRequest || !hasOlderMessages) {
      return;
    }

    const targetMessageId = chatMessages[chatMessages.length - 1].id;

    fetchPaginatedMessages({
      loadingState: channelMessagesLoading,
      hasMoreMessages: hasOlderMessages,
      isInitialRequest,
      fetchMore,
      channelId,
      pageSize: CHAT_CHANNEL_DETAIL_PAGE_SIZE,
      targetMessageId,
      direction: DirectionPagination.Past,
    });
  };

  const onPressAvatar = (username: string) => {
    navigate('UserInformation', { username });
  };

  const navigateToThread = (threadId: number, firstMessageId: number) => {
    navigate('ThreadDetail', {
      channelId,
      threadId,
      threadFirstMessageId: firstMessageId,
    });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ChatMessageContent;
    index: number;
  }) => {
    const { isNewDay } = compareTime({
      data: chatMessages,
      currIndex: index,
      inverted: true,
    });
    const senderUsername = item.user?.username || '';
    const unread = hasUnread ? lastMessageId === item.id : false;
    const { threadId, id, user } = item;

    // Calculate message grouping info for bubble chat
    const groupInfo = currentUserId
      ? getMessageGroupInfo(chatMessages, index, currentUserId, true)
      : {
        isFirstInGroup: false,
        isLastInGroup: false,
        showAvatar: false,
        showTimestamp: false,
        timeSinceLastMessage: 0,
      };

    const onReplies = () => {
      if (threadId) {
        navigateToThread(threadId, id);
      } else {
        setLoadingMessageId(id);
        createThread({
          variables: {
            channelId,
            createThreadInput: { originalMessageId: id },
          },
        });
      }
    };

    return (
      <ChatMessageItem
        content={item}
        sender={user}
        newTimestamp={isNewDay}
        onPressAvatar={() => onPressAvatar(senderUsername)}
        unread={unread}
        settings={shouldDisplayTimestamp(chatMessages, index, true)}
        onPressReplies={onReplies}
        hideReplies={
          !(
            threadEnabled ??
            chatChannelDetailData?.getChatChannelDetail.channel
              .threadingEnabled ??
            channelDetail?.threadingEnabled
          )
        }
        isLoading={loadingMessageId === id}
        currentUserId={currentUserId}
        isFirstInGroup={groupInfo.isFirstInGroup}
        isLastInGroup={groupInfo.isLastInGroup}
        showAvatar={groupInfo.showAvatar}
        showTimestamp={groupInfo.showTimestamp}
      />
    );
  };

  const keyExtractor = ({ id }: ChatMessageContent) => `message-${id}`;

  const onMessageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollPosition.current = event.nativeEvent.contentOffset.y;
  };

  const onPressMore = () => {
    setShowActionSheet(true);
  };

  const actionItemOptions = () => {
    const options: ActionSheetProps['options'] = [];

    if (ios) {
      options.push({ label: t('Cancel') });
    }
    options.push({ label: t('Leave Channel') });

    return options;
  };

  const actionItemOnPress = (btnIndex: number) => {
    if (btnIndex === 0) {
      return Alert.alert(
        t('Leave Channel?'),
        t('Are you sure you want to leave this channel?'),
        [
          { text: t('Cancel') },
          {
            text: t('Leave'),
            onPress: () => {
              leaveChannel({ variables: { channelId } });
            },
          },
        ],
      );
    }
  };

  const onMessageScrollHandler = ({ index }: OnScrollInfo) => {
    if (index) {
      setTimeout(
        () =>
          virtualListRef.current?.scrollToIndex({
            animated: true,
            index,
          }),
        ios ? 50 : 150,
      );
    }
  };

  const onReply = (message: string) => {
    if (message.trim() !== '') {
      Keyboard.dismiss();

      replyChat({
        variables: {
          channelId,
          replyChatInput: {
            message,
          },
        },
      });
    }
  };

  const onContentSizeChange = () => {
    if (isInitialRequest) {
      setTimeout(() => {
        setIsInitialRequest(false);
      }, 1000);
    }
  };

  const handleTogglePush = async (newValue: boolean) => {
    previousPushEnabled.current = isPushEnabled;

    try {
      await updatePreference(channelId, newValue);
      Toast.show({
        type: 'notificationSuccessToast',
        text1: t('Notifications updated successfully'),
      });
      refetchPreference();
    } catch {
      // --- FIX: Removed unused 'e' variable from catch block ---
      Toast.show({
        type: 'notificationErrorToast',
        text1: t('Failed to update notification preferences'),
        text2: t('Please try again'),
      });
      if (previousPushEnabled.current !== null) {
        refetchPreference();
      }
    }
  };

  if (chatChannelDetailLoading || channelMessagesLoading) {
    return <LoadingOrError loading />;
  }

  const Header = (
    <CustomHeader
      title={
        channelTitle ??
        chatChannelDetailData?.getChatChannelDetail.channel.title ??
        channelDetail?.title ??
        ''
      }
      subtitle={(() => {
        const count =
          channelDetail?.membershipsCount ??
          chatChannelDetailData?.getChatChannelDetail.channel
            .membershipsCount ??
          memberCount ??
          0;

        return count > 1
          ? t('{count} members', { count })
          : t('{count} member', { count });
      })()}
      rightIcon="More"
      onPressRight={onPressMore}
      onPressTitle={() => setMenuVisible(true)}
      isLoading={channelMessagesLoading && !isInitialRequest}
    />
  );

  return (
    <>
      <SafeAreaView style={styles.container}>
        {Header}
        <ChannelSettingsMenu
          visible={isMenuVisible}
          onClose={() => setMenuVisible(false)}
          channelTitle={
            channelTitle ??
            chatChannelDetailData?.getChatChannelDetail.channel.title ??
            channelDetail?.title ??
            ''
          }
          isPushEnabled={preference?.pushEnabled ?? true}
          onTogglePush={handleTogglePush}
          isLoading={updatePreferenceLoading}
        />
        <ChatList
          testID="Chat:ChatList"
          ref={virtualListRef}
          data={chatMessages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={() => loadMoreMessages()}
          onContentSizeChange={onContentSizeChange}
          contentContainerStyle={styles.messages}
          onScroll={onMessageScroll}
          onScrollToIndexFailed={onMessageScrollHandler}
          inverted
          textInputFocused={textInputFocused}
          screen={screen}
          contentInset={{
            top: textInputFocused
              ? ((isTablet ? (isTabletLandscape ? 45 : 25) : 30) *
                screen.height) /
              100
              : 0,
            bottom: textInputFocused ? ((2 * screen.height) / 100) * -1 : 0,
          }}
          ListFooterComponent={
            <FooterLoadingIndicator
              isHidden={isInitialRequest || !hasOlderMessages}
            />
          }
          maintainVisibleContentPosition={
            shouldMaintainVisiblePosition
              ? { minIndexForVisible: 1 }
              : undefined
          }
        />
        <FooterReplyChat
          message={message}
          setMessage={setMessage}
          listRef={virtualListRef}
          ref={messageRef}
          replyLoading={replyLoading}
          setInputFocused={setInputFocused}
          onReply={onReply}
          onFocus={() => {
            setInputFocused(true);
            if (scrollPosition.current < 200) {
              setTimeout(() => {
                virtualListRef.current?.scrollToOffset({
                  offset: (47 * screen.height * -1) / 100,
                });
              }, 50);
            }
          }}
          onBlur={() => {
            setInputFocused(false);
            if (scrollPosition.current < 200) {
              setTimeout(() => {
                virtualListRef.current?.scrollToOffset({
                  offset: 0,
                });
              }, 50);
            }
          }}
        />
      </SafeAreaView>
      <ActionSheet
        visible={showActionSheet}
        options={actionItemOptions()}
        cancelButtonIndex={ios ? 0 : undefined}
        actionItemOnPress={actionItemOnPress}
        onClose={() => {
          setShowActionSheet(false);
        }}
        style={!ios && styles.androidModalContainer}
      />
    </>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    messages: { paddingBottom: spacing.l },
    androidModalContainer: {
      paddingHorizontal: spacing.xxxl,
    },
  };
});
