import { OperationVariables, useFragment } from '@apollo/client';
import React from 'react';

import {
  PostFragment,
  PostFragmentDoc,
  TopicFragment,
  TopicFragmentDoc,
} from '../../generatedAPI/server';
import {
  getImage,
  postDetailContentHandler,
  transformPostsToFrontendPost,
  transformTopicToPost,
  useStorage,
} from '../../helpers';
import { makeStyles } from '../../theme';
import { Channel } from '../../types';
import { MetricsProp } from '../Metrics/Metrics';

import { getCompleteImageVideoUrls } from '../../helpers/api/processRawContent';
import { markdownToHtml } from '../../helpers/markdownToHtml';
import { useImageDimensions } from '../../hooks/useImageDimensions';

import { PostItem, PostItemProps } from './PostItem';
import { PostItemFooter, PostItemFooterProps } from './PostItemFooter';

type Props = Required<
  Pick<
    PostItemProps,
    'isHidden' | 'mentionedUsers' | 'onPressViewIgnoredContent'
  >
> &
  Pick<PostItemProps, 'polls' | 'postId' | 'pollsVotes'> &
  Pick<MetricsProp, 'onPressReply'> & {
    topicId: number;
    content: string;
    postDetailContent?: ReturnType<typeof postDetailContentHandler>;
    postId?: number;
  };

function BasePostDetailHeaderItem(props: Props) {
  const storage = useStorage();
  const styles = useStyles();

  const {
    topicId,
    content,
    postDetailContent,
    isHidden,
    mentionedUsers,
    onPressReply,
    onPressViewIgnoredContent,
    polls,
    postId,
    pollsVotes,
  } = props;

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const images =
    (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[]) || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  const { dimensions } = useImageDimensions(images);
  // --- END OF PATTERN ---

  const cacheTopicResult = useFragment<TopicFragment, OperationVariables>({
    fragment: TopicFragmentDoc,
    fragmentName: 'TopicFragment',
    from: {
      __typename: 'Topic',
      id: topicId,
    },
  });
  const cacheFirstPostResult = useFragment<PostFragment, OperationVariables>({
    fragment: PostFragmentDoc,
    fragmentName: 'PostFragment',
    from: {
      __typename: 'Post',
      id: postId,
    },
  });
  const cachedTopic = cacheTopicResult.data;
  const cachedFirstPost = cacheFirstPostResult.data;
  const username = storage.getItem('user')?.username ?? '';
  const channels = storage.getItem('channels') ?? [];

  const resolvedPostItemPropsResult = resolvePostItemProps({
    postDetailContent,
    // Type guard: only pass if we have complete data with id
    cachedTopic: cachedTopic && typeof cachedTopic.id === 'number' ? cachedTopic as TopicFragment : undefined,
    username,
    channels,
    // Type guard: only pass if we have complete data with id
    cachedFirstPost: cachedFirstPost && typeof cachedFirstPost.id === 'number' ? cachedFirstPost as PostFragment : undefined,
  });

  if (!resolvedPostItemPropsResult) {
    // This can be a valid state while loading, so we can return a loading indicator or null.
    // For now, returning null to avoid a crash.
    return null;
  }

  const { postItemProps, postItemFooterProps } = resolvedPostItemPropsResult;
  // DEBUG LOG
  if (__DEV__) {
    console.log('[PostDetailHeaderItem] Rendering:', {
      imagesCount: images.length,
      firstImage: images[0],
      topicId,
    });
  }
  return (
    <PostItem
      topicId={topicId}
      title={postItemProps.title}
      content={contentWithoutImages} // Pass the processed content
      images={images} // Pass the extracted images
      imageDimensionsMap={dimensions}
      avatar={postItemProps.avatar}
      channel={postItemProps.channel}
      tags={postItemProps.tags}
      isHidden={isHidden}
      createdAt={postItemProps.createdAt}
      username={postItemProps.username}
      isLiked={postItemProps.isLiked}
      mentionedUsers={mentionedUsers}
      onPressViewIgnoredContent={onPressViewIgnoredContent}
      nonclickable
      showStatus
      emojiCode={postItemProps.emojiCode}
      polls={polls}
      pollsVotes={pollsVotes}
      postId={postId}
      testIDStatus="PostDetailHeaderItem:Author:EmojiStatus"
      footer={
        <PostItemFooter
          postId={postItemFooterProps.postId}
          topicId={topicId}
          viewCount={postItemFooterProps.viewCount}
          likeCount={postItemFooterProps.likeCount}
          replyCount={postItemFooterProps.replyCount}
          isLiked={postItemFooterProps.isLiked}
          isCreator={postItemFooterProps.isCreator}
          postNumber={postItemFooterProps.postNumber}
          frequentPosters={postItemFooterProps.frequentPosters.slice(1)}
          likePerformedFrom={'topic-detail'}
          onPressReply={onPressReply}
          style={styles.spacingTop}
        />
      }
    />
  );
}

type ResolvePostItemPropsParams = {
  postDetailContent: ReturnType<typeof postDetailContentHandler> | undefined;
  cachedTopic?: TopicFragment;
  username: string;
  channels: Array<Channel>;
  cachedFirstPost?: PostFragment;
};
const resolvePostItemProps = ({
  postDetailContent,
  cachedTopic,
  username,
  channels,
  cachedFirstPost,
}: ResolvePostItemPropsParams):
  | {
    postItemProps: Omit<PostItemProps, 'topicId'>;
    postItemFooterProps: Omit<PostItemFooterProps, 'topicId' | 'postList'>;
  }
  | undefined => {
  if (!postDetailContent && !cachedTopic) {
    return;
  }

  if (postDetailContent) {
    const { topic } = postDetailContent;
    let { firstPost } = postDetailContent;
    if (!firstPost && cachedFirstPost?.id) {
      const freqPosters = cachedTopic?.posters
        ? cachedTopic.posters.map(({ user }) => ({
          id: user.id,
          username: user.username,
          avatar: getImage(user.avatar),
          name: user.name,
        }))
        : [];
      const channel = channels?.find(
        (channel) => channel.id === cachedTopic?.categoryId,
      );
      const formattedFirstPost = transformPostsToFrontendPost({
        post: cachedFirstPost,
        channel,
        freqPosters,
      });
      firstPost = formattedFirstPost;
    }

    if (firstPost) {
      const isCreator = firstPost?.username === username;
      return {
        postItemProps: {
          title: topic.title,
          content: firstPost.content,
          avatar: firstPost.avatar,
          channel: firstPost.channel,
          tags: topic.selectedTag,
          createdAt: firstPost.createdAt,
          username: firstPost.username,
          isLiked: firstPost.isLiked,
          emojiCode: firstPost.emojiStatus,
          postId: firstPost.id,
        },
        postItemFooterProps: {
          postId: firstPost.id,
          viewCount: topic.viewCount,
          likeCount: firstPost.likeCount,
          replyCount: topic.replyCount,
          isLiked: firstPost.isLiked,
          isCreator: isCreator,
          postNumber: firstPost.postNumber,
          frequentPosters: firstPost.freqPosters.slice(1),
        },
      };
    }
  }
  if (cachedTopic) {
    const { topicId: transformedTopicId, ...post } = transformTopicToPost({
      ...cachedTopic,
      channels,
    });
    void transformedTopicId;
    return {
      postItemProps: post,
      postItemFooterProps: {
        isLiked: post.isLiked,
        replyCount: 0,
        likeCount: 0,
        frequentPosters: [],
      },
    };
  }
};

const useStyles = makeStyles(({ spacing }) => ({
  spacingTop: {
    paddingTop: spacing.m,
  },
}));
const PostDetailHeaderItem = React.memo(BasePostDetailHeaderItem);

export { PostDetailHeaderItem, Props as PostDetailHeaderItemProps };
