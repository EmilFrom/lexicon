import { OperationVariables, useFragment } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';

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

  const cacheTopicResult = useFragment<
    TopicFragment,
    OperationVariables
  >({
    fragment: TopicFragmentDoc,
    fragmentName: 'TopicFragment',
    from: {
      __typename: 'Topic',
      id: topicId,
    },
  });
  const cacheTopic = cacheTopicResult.data;

  if (!cacheTopicResult.complete || !cacheTopic) {
    /**
     * This shouldn't ever happen since postList
     * have always already loaded the topic by this point.
     */
    throw new Error('Post not found');
  }

  const channelsData = storage.getItem('channels');
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
    content: excerptContent,
    imageUrls,
    pinned,
  } = transformTopicToPost({ ...cacheTopic, channels: channelsData ?? [] });

  // Fetch first post content (cache-first, lazy-loaded)
  const { content: firstPostContent } = useFirstPostContent(topicId);

  // Use first post content if available, otherwise fall back to excerpt
  const content = firstPostContent || excerptContent;

  const isCreator = username === storage.getItem('user')?.username;

  // Memoize callback to prevent unnecessary re-renders
  const onPressPost = useCallback(() => {
    navigate('PostDetail', {
      topicId,
      prevScreen,
      focusedPostNumber: undefined,
      content,
      hidden: isHidden,
    });
  }, [navigate, topicId, prevScreen, content, isHidden]);

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
      numberOfLines={5}
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
