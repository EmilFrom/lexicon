import { OperationVariables, useFragment } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';

import { TopicFragment, TopicFragmentDoc } from '../../generatedAPI/server';
import { transformTopicToPost, useStorage } from '../../helpers';
import { useFirstPostContent } from '../../hooks';
import { makeStyles } from '../../theme';
import { StackNavProp } from '../../types';
import { MetricsProp } from '../Metrics/Metrics';

import { PostItem, PostItemProps } from './PostItem';
import { PostItemFooter } from './PostItemFooter';

type Props = Pick<
  PostItemProps,
  'prevScreen' | 'isHidden' | 'topicId' | 'style'
> &
  Pick<MetricsProp, 'onPressReply'>;

function BaseHomePostItem(props: Props) {
  const { navigate } = useNavigation<StackNavProp<'TabNav'>>();
  const storage = useStorage();
  const styles = useStyles();

  const { topicId, prevScreen, isHidden = false, onPressReply, style } = props;

  // 1. HOOK: Always call useFragment
  const cacheTopicResult = useFragment<TopicFragment, OperationVariables>({
    fragment: TopicFragmentDoc,
    fragmentName: 'TopicFragment',
    from: {
      __typename: 'Topic',
      id: topicId,
    },
  });
  const cacheTopic = cacheTopicResult.data;

  // 2. HOOK: Always call useFirstPostContent
  const { content: firstPostContent } = useFirstPostContent(topicId);

  const channelsData = storage.getItem('channels');

  const postData = useMemo(() => {
    // Type guard: ensure we have a complete topic with required fields
    if (!cacheTopic || typeof cacheTopic.id !== 'number') {
      return undefined;
    }
    // Now TypeScript knows cacheTopic has all required fields
    return transformTopicToPost({
      ...cacheTopic as TopicFragment,
      channels: channelsData ?? []
    });
  }, [cacheTopic, channelsData]);

  // Derive content safe for the callback dependency
  const content = firstPostContent || postData?.content || '';

  // 4. HOOK: Always call useCallback (it depends on 'content' which we safely derived above)
  const onPressPost = useCallback(() => {
    navigate('PostDetail', {
      topicId,
      prevScreen,
      focusedPostNumber: undefined,
      content,
      hidden: isHidden,
    });
  }, [navigate, topicId, prevScreen, content, isHidden]);

  // 5. GUARD: Now it is safe to return early because all hooks have executed.
  if (!cacheTopicResult.complete || !cacheTopic || !postData) {
    return null;
  }

  // 6. DESTRUCTURE: Now we can safely extract variables from postData
  const {
    title,
    avatar,
    username,
    channel,
    tags,
    viewCount,
    replyCount,
    likeCount,
    hidden,
    createdAt,
    isLiked,
    freqPosters,
    postNumber,
    imageUrls,
    pinned,
  } = postData;

  const isCreator = username === storage.getItem('user')?.username;
  const imagePreviewUrls = firstPostContent ? undefined : imageUrls;

  return (
    <PostItem
      topicId={topicId}
      title={title}
      content={content}
      images={imagePreviewUrls}
      avatar={avatar}
      channel={channel}
      tags={tags}
      hidden={hidden}
      createdAt={createdAt}
      username={username}
      isLiked={isLiked}
      showImageRow={!firstPostContent && !!imagePreviewUrls?.length}
      pinned={pinned}
      style={style}
      footer={
        <PostItemFooter
          topicId={topicId}
          postList
          viewCount={viewCount}
          likeCount={likeCount}
          replyCount={replyCount}
          isLiked={isLiked}
          isCreator={isCreator}
          postNumber={postNumber}
          frequentPosters={freqPosters.slice(1)}
          likePerformedFrom={'home-scene'}
          onPressReply={onPressReply}
          // Use the hoisted callback
          onPressView={onPressPost}
          style={styles.spacingTop}
        />
      }
    />
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  spacingTop: {
    paddingTop: spacing.m,
  },
}));

// Custom comparison function for React.memo
// Only re-render if topicId changes (content updates are handled internally)
const areEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.topicId === nextProps.topicId &&
    prevProps.prevScreen === nextProps.prevScreen &&
    prevProps.isHidden === nextProps.isHidden
  );
};

const HomePostItem = React.memo(BaseHomePostItem, areEqual);
export { HomePostItem, Props as HomePostItemProps };