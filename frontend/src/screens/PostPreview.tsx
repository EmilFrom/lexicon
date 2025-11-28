import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useMemo } from 'react';
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
import { FORM_DEFAULT_VALUES } from '../constants';
import { Divider, IconWithLabel, Text } from '../core-ui';
import { FullScreenImageModal } from '../components/FullScreenImageModal';
import {
  combineContentWithPollContent,
  errorHandlerAlert,
  getImage,
  getPostShortUrl,
  // --- FIX: Removed unused sortImageUrl ---
  useStorage,
} from '../helpers';
import { markdownToHtml } from '../helpers/markdownToHtml';
import { getCompleteImageVideoUrls } from '../helpers/api/processRawContent';
import {
  useEditPost,
  useEditTopic,
  useLookupUrls,
  useNewTopic,
  useReplyTopic,
  useImageDimensions,
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
    params: {
      reply,
      postData,
      editPostId,
      editTopicId,
      editedUser,
      imageMarkdown = '',
    },
  } = useRoute<RootStackRouteProp<'PostPreview'>>();

  const storage = useStorage();
  const channels = storage.getItem('channels');
  const { reset: resetForm, getValues, watch } = useFormContext();

  // Map to store resolved URLs (upload:// -> https://)
  const [resolvedUrlMap, setResolvedUrlMap] = useState<Record<string, string>>(
    {},
  );

  const { title, raw: formContent, tags, channelId } = getValues();
  const draftKey: string | undefined = watch('draftKey');

  // Combine form content with image markdown for preview
  const content = `${formContent}\n${imageMarkdown}`;

  const shortUrls = getPostShortUrl(content) ?? [];

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);

  const imagesFromContent = useMemo(() => {
    return (
      (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[]) ||
      []
    );
  }, [htmlContent]);

  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  const { getImageUrls } = useLookupUrls({
    variables: { lookupUrlInput: { shortUrls } },
    onCompleted: ({ lookupUrls }) => {
      // Populate the map with resolved URLs
      const newMap: Record<string, string> = {};
      lookupUrls.forEach((item) => {
        newMap[item.shortUrl] = item.url;
      });
      setResolvedUrlMap(newMap);
    },
  });

  // Filter and resolve images for the carousel
  // This ensures we don't pass "upload://" URLs to AuthenticatedImage
  const displayImages = useMemo(() => {
    return imagesFromContent
      .map((url) => {
        if (url.startsWith('upload://')) {
          // Return the https version if available in our map
          return resolvedUrlMap[url] || null;
        }
        return url;
      })
      .filter((url): url is string => !!url);
  }, [imagesFromContent, resolvedUrlMap]);

  // Fetch dimensions for the resolved images
  const { dimensions } = useImageDimensions(displayImages);

  const forceRefreshTopics = () => {
    // This nuclear option deletes the cached list of topics.
    // The next time Home.tsx renders or focuses, it WILL fetch from the network.
    client.cache.evict({ fieldName: 'topics' });
    client.cache.gc();
  };

  const { newTopic, loading: newTopicLoading } = useNewTopic({
    onCompleted: () => {
      forceRefreshTopics();
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => errorHandlerAlert(error),
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
      forceRefreshTopics();
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => errorHandlerAlert(error),
  });

  const { editPost, loading: editPostLoading } = useEditPost({
    onCompleted: () => {
      forceRefreshTopics();
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => errorHandlerAlert(error),
  });

  const { editTopic, loading: editTopicLoading } = useEditTopic({
    onCompleted: () => {
      forceRefreshTopics();
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => errorHandlerAlert(error),
  });

  const loading = reply
    ? replyLoading || editPostLoading
    : newTopicLoading || editTopicLoading;

  useEffect(() => {
    if (shortUrls.length > 0) {
      getImageUrls({ variables: { lookupUrlInput: { shortUrls } } });
    }
  }, [getImageUrls, JSON.stringify(shortUrls)]);

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
          left={
            <HeaderItem
              label={t('Cancel')}
              onPressItem={goBack}
              disabled={loading}
              left
            />
          }
          right={
            <HeaderItem
              label={t('Post')}
              onPressItem={postToServer}
              loading={loading}
            />
          }
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
          image={
            editedUser
              ? editedUser.avatar
              : getImage(storage.getItem('user')?.avatar || '')
          }
          title={
            editedUser
              ? editedUser.username
              : storage.getItem('user')?.username || ''
          }
          size="s"
          style={styles.spacingBottom}
        />
        {!reply && channelId && (
          <PostGroupings
            style={styles.spacingBottom}
            channel={
              channels?.find(({ id }) => id === channelId) || mock.channels[0]
            }
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

        {/* Updated ImageCarousel with resolved images and dimensions */}
        <ImageCarousel
          images={displayImages}
          onImagePress={(uri) => setFullScreenImage(uri)}
          imageDimensionsMap={dimensions}
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
