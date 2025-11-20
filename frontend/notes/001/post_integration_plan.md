# Plan to Integrate Markdown Rendering in PostDetail and PostPreview

## 1. Analysis

The successful implementation on the HomeScreen confirms that our `MarkdownRenderer` and the "Content Processing Pattern" are correct. The blank screens on `PostDetail` and `PostPreview` indicate that this pattern has not yet been implemented in those components. This plan will provide the complete code needed to add the rendering logic to both screens.

## 2. Plan

The plan is to modify `PostDetail.tsx`'s header component and `PostPreview.tsx` to incorporate the full content processing logic.

---

### Part 1: Implementing Content Rendering in `PostDetailHeader.tsx`

**Objective:** Fetch the post content, process it, and render it using `<MarkdownRenderer>` and `<ImageCarousel>`.

**File Path:** `src/screens/PostDetail/components/PostDetailHeader.tsx`

**Full Code:**
```typescript
import React, { useState } from 'react';
import { View } from 'react-native';

import {
  Author,
  ImageCarousel,
  MarkdownRenderer,
  Poll,
  PostGroupings,
  FullScreenImageModal,
} from '../../../components';
import { Divider } from '../../../core-ui';
import {
  formatRelativeTime,
  handleUnsupportedMarkdown,
  markdownToHtml,
  getCompleteImageVideoUrls,
  useStorage,
} from '../../../helpers';
import { makeStyles } from '../../../theme';
import { Post, Poll as PollType } from '../../../types';

type Props = {
  post: Post;
  onPressAuthor?: (username: string) => void;
};

export function PostDetailHeader({ post, onPressAuthor }: Props) {
  const styles = useStyles();
  const storage = useStorage();
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const {
    avatar,
    username,
    createdAt,
    content,
    channel,
    tags,
    polls,
    pollsVotes,
    id,
    topicId,
  } = post;

  const isCreator = username === storage.getItem('user')?.username;
  const time = formatRelativeTime(createdAt);

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  const renderPolls = () => {
    if (!polls) {
      return null;
    }
    return polls.map((poll: PollType, index: number) => {
      const pollVotes = pollsVotes?.find(
        (pollVote) => pollVote.pollName === poll.name,
      );
      return (
        <Poll
          key={index}
          poll={poll}
          pollVotes={pollVotes?.pollOptionIds}
          isCreator={isCreator}
          postId={id}
          topicId={topicId}
          postCreatedAt={createdAt}
        />
      );
    });
  };

  return (
    <>
      <View style={styles.container}>
        <Author
          image={avatar}
          title={username}
          subtitle={time}
          onPressAuthor={onPressAuthor}
          showStatus
        />
        <PostGroupings
          style={styles.postGroupingsContainer}
          channel={channel}
          tags={tags}
        />
        <View style={styles.contentContainer}>
          {renderPolls()}
          <MarkdownRenderer content={handleUnsupportedMarkdown(contentWithoutImages)} />
          <ImageCarousel
            images={images}
            onImagePress={(uri) => setFullScreenImage(uri)}
          />
        </View>
        <Divider />
      </View>
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </>
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  postGroupingsContainer: {
    paddingVertical: spacing.l,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
}));
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
