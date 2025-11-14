import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import mock from '../__mocks__/mockData';
import {
  Author,
  CustomHeader,
  HeaderItem,
  LocalRepliedPost,
  MarkdownContent,
  ModalHeader,
  PostGroupings,
} from '../components';
import { PollPostPreview } from '../components/Poll';
import { FORM_DEFAULT_VALUES, refetchQueriesPostDraft } from '../constants';
import { CustomImage, Divider, IconWithLabel, Text } from '../core-ui';
import {
  combineContentWithPollContent,
  errorHandlerAlert,
  generateMarkdownContent,
  getImage,
  getPostShortUrl,
  sortImageUrl,
  useStorage,
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

  // Manual lock for listener effect – no extra state/ref needed anymore.

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
  const images = postData.images;

  const { getImageUrls } = useLookupUrls({
    variables: { lookupUrlInput: { shortUrls } },
    onCompleted: ({ lookupUrls }) => {
      setImageUrls(sortImageUrl(shortUrls, lookupUrls));
    },
  });

  const refetchQueries = isDraft ? refetchQueriesPostDraft : [];

  // --- ALL onCompleted HANDLERS ARE NOW CORRECTED ---

  const { newTopic, loading: newTopicLoading } = useNewTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2); // Now we can use the more powerful pop(2)
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    refetchQueries,
  });

  const { reply: replyTopic, loading: replyLoading } = useReplyTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2); // Now we can use the more powerful pop(2)
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
    refetchQueries,
  });

  const { editPost, loading: editPostLoading } = useEditPost({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2); // Now we can use the more powerful pop(2)
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
  });

  const { editTopic, loading: editTopicLoading } = useEditTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2); // Now we can use the more powerful pop(2)
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
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

    if (editPostId || editTopicId) {
      if (editPostId) {
        editPost({
          variables: {
            postId: editPostId,
            editPostInput: {
              post: {
                raw: updatedContentWithPoll,
              },
            },
          },
        });
      }
      if (editTopicId) {
        editTopic({
          variables: {
            topicId: editTopicId,
            topicInput: {
              title,
              categoryId: channelId || 0,
              tags,
            },
          },
        });
      }
      return;
    }
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
        <MarkdownContent
          content={generateMarkdownContent(content, imageUrls)}
          style={styles.markdown}
          nonClickable={true}
        />
        {!reply &&
          images?.map((image, index) => (
            <CustomImage
              src={image}
              style={styles.spacingBottom}
              key={`images-${index}`}
            />
          ))}
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
