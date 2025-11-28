import { useNavigation } from '@react-navigation/native';
import React, { useState, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Platform, RefreshControl, VirtualizedList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CustomHeader,
  FooterLoadingIndicator,
  LoadingOrError,
} from '../../components';
import { FIRST_POST_NUMBER, FORM_DEFAULT_VALUES } from '../../constants';
import { FloatingButton } from '../../core-ui';
import { MessageQuery } from '../../generatedAPI/server';
import { errorHandler, getParticipants, useStorage } from '../../helpers';
import { useMessageList } from '../../hooks';
import { makeStyles, useTheme } from '../../theme';
import { StackNavProp } from '../../types';
import { useDevice } from '../../utils';

import { MessageCard } from './Components';

type MessageType = NonNullable<
  MessageQuery['privateMessageQuery']['topicList']['topics']
>[number];

type MessageRenderItem = { item: MessageType; index: number };

export default function Messages() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { isTabletLandscape } = useDevice();
  const { reset } = useFormContext();

  const { navigate } = useNavigation<StackNavProp<'Messages'>>();

  const storage = useStorage();
  const username = storage.getItem('user')?.username || '';

  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const ios = Platform.OS === 'ios';

  const {
    error,
    refetch,
    fetchMore,
    data: messagesData,
    loading: loadingList,
  } = useMessageList(
    {
      variables: { username, page },
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
    },
    'HIDE_ALERT',
  );

  const messages = useMemo(() => {
    return messagesData?.privateMessageList?.topicList?.topics ?? [];
  }, [messagesData]);

  const participants = useMemo(() => {
    const users = messagesData?.privateMessageList?.users ?? [];
    return messages.map((message) => {
      const participantIds = message.participants?.map((p) => p.userId) ?? [];
      const lastPosterUsername = message.lastPosterUsername ?? '';

      return getParticipants(
        participantIds,
        users,
        username,
        lastPosterUsername,
      );
    });
  }, [messages, messagesData?.privateMessageList?.users, username]);

  const conditionHiddenFooterLoading = !hasMore || messages.length <= 20;

  const onPressNewMessage = async () => {
    reset(FORM_DEFAULT_VALUES);
    navigate('NewMessage');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    try {
      await refetch({ username, page: 0 });
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (conditionHiddenFooterLoading || loadingList || loadingMore) {
      return;
    }

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const { data } = await fetchMore({
        variables: { username, page: nextPage },
      });
      const newTopics = data?.privateMessageList?.topicList?.topics ?? [];
      if (newTopics.length === 0) {
        setHasMore(false);
      } else {
        setPage(nextPage);
      }
    } catch {
      // Error is handled by the hook's error state passed to UI
    } finally {
      setLoadingMore(false);
    }
  };

  const getItem = (messages: Array<MessageType>, index: number) =>
    messages[index];

  const getItemCount = (messages: Array<MessageType>) => messages.length;

  const getItemLayout = (data: MessageType, index: number) => ({
    length: 85,
    offset: 85 * index,
    index,
  });

  const keyExtractor = ({ id }: MessageType) => `message-${id}`;

  const renderItem = ({ item, index }: MessageRenderItem) => (
    <MessageCard
      id={item.id}
      message={item.title}
      messageParticipants={participants[index]}
      allowedUserCount={item.allowedUserCount}
      postNumber={item.lastReadPostNumber ?? FIRST_POST_NUMBER}
      date={item.lastPostedAt || ''}
      seen={!item.unseen}
      testID={`MessageList:MessageCard:${item.id}`}
    />
  );

  let content;
  if (error) {
    content = <LoadingOrError message={errorHandler(error, true)} />;
  } else if (loadingList && messages.length < 1 && !refreshing) {
    content = <LoadingOrError loading />;
  } else if (!loadingList && messages.length < 1 && !refreshing) {
    content = <LoadingOrError message={t('You have no messages')} />;
  } else {
    content = (
      <VirtualizedList
        data={messages}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.loading}
          />
        }
        getItem={getItem}
        getItemCount={getItemCount}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onEndReachedThreshold={0.1}
        onEndReached={onEndReached}
        ListFooterComponent={
          <FooterLoadingIndicator isHidden={conditionHiddenFooterLoading} />
        }
        style={styles.messageContainer}
        testID="Messages:List"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {ios && (
        <CustomHeader
          title={t('Messages')}
          rightIcon="Add"
          onPressRight={onPressNewMessage}
          hideHeaderLeft={isTabletLandscape}
        />
      )}
      {content}
      {!ios && (
        <FloatingButton onPress={onPressNewMessage} style={styles.fab} />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  messageContainer: {
    flex: 1,
    width: '100%',
  },
  fab: {
    position: 'absolute',
    marginRight: spacing.xxl,
    marginBottom: spacing.xxl,
    right: 0,
    bottom: 0,
  },
}));
