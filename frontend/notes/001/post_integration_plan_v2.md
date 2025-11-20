# Corrected Plan to Integrate Markdown Rendering (v2)

## 1. Analysis

This plan corrects the previous version by targeting the right files. The architecture is now clear: `PostDetail.tsx` is the data-fetching container, and `PostDetailHeaderItem.tsx` is the presentational component for the main post. The blank screen is caused by `PostDetailHeaderItem.tsx` not correctly processing and passing down the content to its child `PostItem`.

This plan applies our proven "Content Processing Pattern" to `PostDetailHeaderItem.tsx` and reaffirms the correct implementation for `PostPreview.tsx`.

## 2. Plan

---

### Part 1: Correctly Implement Content Rendering in `PostDetailHeaderItem.tsx`

**Objective:** Process the `content` prop in `PostDetailHeaderItem.tsx` and pass the processed data down to the `<PostItem>` component.

**File Path:** `src/components/PostItem/PostDetailHeaderItem.tsx`

**Full Code:**
```typescript
import { OperationVariables, useFragment_experimental } from '@apollo/client';
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
  markdownToHtml,
  getCompleteImageVideoUrls,
} from '../../helpers';
import { makeStyles } from '../../theme';
import { Channel } from '../../types';
import { MetricsProp } from '../Metrics/Metrics';

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
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  const cacheTopicResult = useFragment_experimental<
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
  const cacheFirstPostResult = useFragment_experimental<
    PostFragment,
    OperationVariables
  >({
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
    cachedTopic,
    username,
    channels,
    cachedFirstPost,
  });

  if (!resolvedPostItemPropsResult) {
    // This can be a valid state while loading, so we can return a loading indicator or null.
    // For now, returning null to avoid a crash.
    return null;
  }

  const { postItemProps, postItemFooterProps } = resolvedPostItemPropsResult;
  return (
    <PostItem
      topicId={topicId}
      title={postItemProps.title}
      content={contentWithoutImages} // Pass the processed content
      images={images} // Pass the extracted images
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
```

---

### Part 2: Implementing Content Rendering in `PostPreview.tsx`

**Objective:** Take the raw markdown from the form state, process it, and render a preview.

**File Path:** `src/screens/PostPreview.tsx`

**Full Code:**
```typescript
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import mock from '../__mocks__/mockData';
import { client } from '../api/client';
import {
  Author,
  CustomHeader,
  HeaderItem,
  LocalRepliedPost,
  ModalHeader,
  PostGroupings,
  ImageCarousel,
  MarkdownRenderer,
} from '../components';
import { PollPostPreview } from '../components/Poll';
import { FORM_DEFAULT_VALUES, refetchQueriesPostDraft } from '../constants';
import { Divider, IconWithLabel, Text } from '../core-ui';
import { FullScreenImageModal } from '../components/FullScreenImageModal';
import {
  combineContentWithPollContent,
  errorHandlerAlert,
  getImage,
  getPostShortUrl,
  sortImageUrl,
  useStorage,
  markdownToHtml,
  getCompleteImageVideoUrls,
} from '../helpers';
import {
  useEditPost,
  useEditTopic,
  useLookupUrls,
  useNewTopic,
  useReplyTopic,
} from '../hooks';
import { makeStyles, useTheme } from '../theme';
import {
  PollFormContextValues,
  RootStackNavProp,
  RootStackRouteProp,
} from '../types';
import { useModal } from '../utils';

const ios = Platform.OS === 'ios';

export default function PostPreview() {
  const { setModal } = useModal();
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<RootStackNavProp<'PostPreview'>>();
  const { goBack } = navigation;
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const {
    params: { reply, postData, editPostId, editTopicId, editedUser },
  } = useRoute<RootStackRouteProp<'PostPreview'>>();

  const storage = useStorage();
  const channels = storage.getItem('channels');
  const { reset: resetForm, getValues, watch } = useFormContext();
  const [imageUrls, setImageUrls] = useState<Array<string>>();
  const { title, raw: content, tags, channelId, isDraft } = getValues();
  const draftKey: string | undefined = watch('draftKey');
  const shortUrls = getPostShortUrl(content) ?? [];

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const imagesFromContent = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  const { getImageUrls } = useLookupUrls({
    variables: { lookupUrlInput: { shortUrls } },
    onCompleted: ({ lookupUrls }) => {
      setImageUrls(sortImageUrl(shortUrls, lookupUrls));
    },
  });

  const refetchQueries = isDraft ? refetchQueriesPostDraft : [];

  const { newTopic, loading: newTopicLoading } = useNewTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    refetchQueries,
  });

  const { reply: replyTopic, loading: replyLoading } = useReplyTopic({
    onCompleted: () => {
      if (postData?.topicId) {
        client.cache.evict({
          id: client.cache.identify({
            __typename: 'TopicDetailOutput',
            id: postData.topicId,
          }),
        });
        client.cache.evict({ fieldName: 'topicDetail' });
        client.cache.gc();
      }
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: errorHandlerAlert,
  });

  const { editPost, loading: editPostLoading } = useEditPost({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: errorHandlerAlert,
  });

  const { editTopic, loading: editTopicLoading } = useEditTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: errorHandlerAlert,
  });

  const loading = reply
    ? replyLoading || editPostLoading
    : newTopicLoading || editTopicLoading;

  useEffect(() => {
    if (shortUrls.length > 0) {
      getImageUrls();
    }
  }, [getImageUrls, shortUrls.length]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (loading) {
          e.preventDefault();
        }
      }),
    [loading, navigation],
  );

  const postToServer = () => {
    setModal(false);
    const polls: Array<PollFormContextValues> = getValues('polls');
    const updatedContentWithPoll = combineContentWithPollContent({
      content,
      polls,
    });

    if (editPostId) {
      editPost({
        variables: {
          postId: editPostId,
          editPostInput: { post: { raw: updatedContentWithPoll } },
        },
      });
    }
    if (editTopicId) {
      editTopic({
        variables: {
          topicId: editTopicId,
          topicInput: { title, categoryId: channelId || 0, tags },
        },
      });
    }
    if (editPostId || editTopicId) return;

    if (reply) {
      replyTopic({
        variables: {
          replyInput: {
            raw: updatedContentWithPoll,
            topicId: postData.topicId || 0,
            replyToPostNumber: postData.postNumber,
            draftKey,
          },
        },
      });
    } else {
      newTopic({
        variables: {
          newTopicInput: {
            title,
            category: channelId || 0,
            tags,
            raw: updatedContentWithPoll,
            draftKey,
          },
        },
      });
    }
  };

  const renderPolls = () => {
    const polls: Array<PollFormContextValues> = getValues('polls');
    if (!polls) {
      return null;
    }
    return polls.map((poll, index) => (
      <PollPostPreview
        key={index}
        options={poll.pollOptions}
        title={poll.title}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title={t('Preview')}
        rightIcon="Send"
        onPressRight={postToServer}
        isLoading={loading}
      />
      {ios && (
        <ModalHeader
          title={t('Preview')}
          left={<HeaderItem label={t('Cancel')} onPressItem={goBack} disabled={loading} left />}
          right={<HeaderItem label={t('Post')} onPressItem={postToServer} loading={loading} />}
        />
      )}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {reply ? (
          <>
            <IconWithLabel
              icon="Replies"
              color={colors.textLighter}
              label={title}
              fontStyle={styles.title}
              style={styles.titleContainer}
              numberOfLines={1}
            />
            <Divider style={styles.spacingBottom} horizontalSpacing="xxl" />
          </>
        ) : (
          <Text style={styles.spacingBottom} variant="semiBold" size="l">
            {title}
          </Text>
        )}
        <Author
          image={editedUser ? editedUser.avatar : getImage(storage.getItem('user')?.avatar || '')}
          title={editedUser ? editedUser.username : storage.getItem('user')?.username || ''}
          size="s"
          style={styles.spacingBottom}
        />
        {!reply && channelId && (
          <PostGroupings
            style={styles.spacingBottom}
            channel={channels?.find(({ id }) => id === channelId) || mock.channels[0]}
            tags={tags}
          />
        )}
        {reply && postData.replyToPostId && (
          <LocalRepliedPost replyToPostId={postData.replyToPostId} />
        )}
        {renderPolls()}
        <MarkdownRenderer
          content={contentWithoutImages}
          style={styles.markdown}
          nonClickable={true}
        />
        <ImageCarousel
          images={imagesFromContent}
          onImagePress={(uri) => setFullScreenImage(uri)}
        />
        <FullScreenImageModal
          visible={!!fullScreenImage}
          imageUri={fullScreenImage || ''}
          onClose={() => setFullScreenImage(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, fontVariants, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: ios ? spacing.xl : spacing.xxl,
  },
  titleContainer: {
    flex: 1,
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
  },
  title: {
    flex: 1,
    ...fontVariants.semiBold,
  },
  markdown: {
    marginTop: spacing.xl,
  },
  spacingBottom: {
    marginBottom: spacing.xl,
  },
}));
```

## 3. Approval

This plan is now ready for your review and approval.
