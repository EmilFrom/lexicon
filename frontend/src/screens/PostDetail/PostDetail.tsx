// src/screens/PostDetail/PostDetail.tsx

import { useNavigation, useRoute } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFormContext } from 'react-hook-form';
import { Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComponentProps } from 'react';

import {
  ActionSheet,
  ActionSheetProps,
  CustomFlatList,
  CustomFlatlistRefType,
  CustomHeader,
  FooterLoadingIndicator,
  LoadingOrError,
  NestedComment,
  PostDetailHeaderItem,
  PressMoreParams,
  PressReplyParams,
  RenderItemCustomOption,
  FullScreenImageModal, // Import the new component
} from '../../components';
import {
  FIRST_POST_NUMBER,
  MAX_POST_COUNT_PER_REQUEST,
} from '../../constants';
import { Text } from '../../core-ui';
import {
  checkDraftAlert,
  errorHandler,
  errorHandlerAlert,
  LoginError,
  postDetailContentHandler,
  privateTopicAlert,
  useStorage,
} from '../../helpers';
import {
  useDeletePostDraft,
  useLazyCheckPostDraft,
  useLoadMorePost,
  usePostRaw,
  useTopicDetail,
  useTopicTiming,
} from '../../hooks';
import { useInitialLoad } from '../../hooks/useInitialLoad';
import { makeStyles, useTheme } from '../../theme';
import { NewPostForm, Post, StackNavProp, StackRouteProp } from '../../types';

import { useNotificationScroll } from './hooks';
import PostDetailSkeletonLoading from './PostDetailSkeletonLoading';

type PostReplyItem = { item: Post };

type OnScrollInfo = {
  index: number;
  highestMeasuredFrameIndex: number;
  averageItemLength: number;
};

const MAX_DEFAULT_LOADED_POST_INDEX = MAX_POST_COUNT_PER_REQUEST - 1;

export default function PostDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<StackNavProp<'PostDetail'>>();
  const { navigate, reset, setParams, goBack } = navigation;
  const useInitialLoadResult = useInitialLoad();
  const {
    params: {
      topicId,
      postNumber = null,
      focusedPostNumber,
      prevScreen,
      hidden,
      content: initialContent,
    },
  } = useRoute<StackRouteProp<'PostDetail'>>();
  const storage = useStorage();
  const currentUserId = storage.getItem('user')?.id;
  const channels = storage.getItem('channels');
  const customFlatListRef = useRef<CustomFlatlistRefType>(null);

  // --- State for the Full-Screen Image Modal ---
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Other state variables...
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  // ... (rest of your existing state declarations)
  const [canFlagFocusPost, setCanFlagFocusPost] = useState(false);
  const [canEditFocusPost, setCanEditFocusPost] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [firstLoadedCommentIndex, setFirstLoadedCommentIndex] =
    useState<number>();
  const [lastLoadedCommentIndex, setLastLoadedCommentIndex] =
    useState<number>();
  const [fromPost, setFromPost] = useState(false);
  const [author, setAuthor] = useState('');
  const [flaggedByCommunity, setFlaggedByCommunity] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [firstPostId, setFirstPostId] = useState<number>(0);
  const [mentionedUsers, setMentionedUsers] = useState<Array<string>>([]);
  const [isHidden, setHidden] = useState(hidden ?? false);
  const [flatListReady, setFlatListReady] = useState(false);

  const postIdOnFocusRef = useRef<number | null>(null);
  const postIdOnFocus = postIdOnFocusRef.current;
  const { setValue } = useFormContext<NewPostForm>();
  const ios = Platform.OS === 'ios';

  // --- Callback to handle image press ---
  const handleImagePress = useCallback((uri: string) => {
    setFullScreenImage(uri);
  }, []);

  // ... (rest of your hooks and functions: useTopicDetail, usePostRaw, etc.)
  const {
    data,
    loading: topicDetailLoading,
    error,
    refetch,
    fetchMore,
  } = useTopicDetail(
    {
      variables: { topicId, postNumber, includeFirstPost: true },
      onCompleted: ({ topicDetail }) => {
        if (topicDetail.deletedAt) {
          Alert.alert(t('Error'), t('This topic has been deleted.'), [
            {
              text: t('Got it'),
              onPress: () => {
                goBack();
              },
            },
          ]);
        }
      },
      onError: (error) => {
        if (error.message.includes('Invalid Access')) {
          if (
            !useInitialLoadResult.loading &&
            !useInitialLoadResult.isLoggedIn
          ) {
            reset({
              index: 1,
              routes: [
                { name: 'TabNav', state: { routes: [{ name: 'Home' }] } },
                { name: 'Welcome' },
              ],
            });
          } else {
            navigate('TabNav', { state: { routes: [{ name: 'Home' }] } });
            privateTopicAlert();
          }
        }
      },
    },
    'HIDE_ALERT',
  );

  const { postRaw } = usePostRaw({
    onCompleted: ({ postRaw: { cooked } }) => {
      setContent(cooked.markdownContent);
      setMentionedUsers(cooked.mentions);
    },
  });

  const { deletePostDraft } = useDeletePostDraft();

  const { checkPostDraft } = useLazyCheckPostDraft();

  const postDetailContent = useMemo(() => {
    if (!data) {
      return;
    }
    return postDetailContentHandler({
      topicDetailData: data.topicDetail,
      channels,
    });
  }, [data, channels]);

  const { topic, postComments, firstPost, stream } = postDetailContent ?? {};

  const canEditFirstPost = Boolean(firstPost?.canEdit);
  const canFlagFirstPost = Boolean(firstPost?.canFlag && !firstPost?.hidden);

  const showOptions = canEditFirstPost || canFlagFirstPost;

  useEffect(() => {
    if (!firstPost) {
      return;
    }
    postRaw({ variables: { postId: firstPost.id } });
    setHidden(firstPost.hidden || false);
    setFirstPostId(firstPost.id);
  }, [firstPost, postRaw]);

  useEffect(() => {
    if (postDetailContent) {
      const { firstLoadedCommentIndex, lastLoadedCommentIndex } =
        postDetailContent;
      if (firstLoadedCommentIndex && lastLoadedCommentIndex) {
        setFirstLoadedCommentIndex(firstLoadedCommentIndex);
        setLastLoadedCommentIndex(lastLoadedCommentIndex);
      }
      setLoading(false);
      setReplyLoading(false);
    }
  }, [postDetailContent]);

  const onPressViewIgnoredContent = () => {
    setHidden(false);
  };

  const refreshPost = async () => {
    setLoadingRefresh(true);
    refetch({ topicId, postNumber: undefined }).then(() => {
      setLoadingRefresh(false);
    });
  };
  const { loadMorePosts, isLoadingOlderPost, isLoadingNewerPost } =
    useLoadMorePost(topicId);
  const loadMoreComments = async (loadNewerPosts: boolean) => {
    if (topicDetailLoading) {
      return;
    }
    const newPostIndex = await loadMorePosts({
      fetchMore,
      firstLoadedPostIndex,
      lastLoadedPostIndex,
      stream: stream ?? undefined,
      loadNewerPosts,
      fetchMoreVariables: { includeFirstPost: undefined },
      hasMorePost: loadNewerPosts ? hasNewerPost : hasOlderPost,
    });
    if (!newPostIndex) {
      return;
    }
    const { nextLastLoadedPostIndex, nextFirstLoadedPostIndex } = newPostIndex;
    if (loadNewerPosts) {
      setLastLoadedCommentIndex(nextLastLoadedPostIndex);
      return;
    }
    setFirstLoadedCommentIndex(nextFirstLoadedPostIndex);
  };

  useTopicTiming(topicId, firstLoadedCommentIndex, stream ?? undefined);

  const firstCommentId = stream?.[1];
  const hasOlderPost =
    stream && postComments?.length
      ? firstCommentId !== postComments[0].id
      : false;
  const hasNewerPost =
    stream && postComments?.length
      ? stream[stream.length - 1] !== postComments[postComments.length - 1].id
      : false;

  useEffect(() => {
    async function refetchData() {
      let index = 0;
      if (focusedPostNumber === 1) {
        await refetch({ topicId });
      } else {
        await refetch({
          topicId,
          postNumber: focusedPostNumber,
        });

        const firstCommentPostNumber = postComments?.[0].postNumber ?? 0;
        const pointerToIndex = focusedPostNumber
          ? focusedPostNumber - firstCommentPostNumber
          : 0;
        index = Math.min(MAX_DEFAULT_LOADED_POST_INDEX, pointerToIndex);
      }
      setTimeout(() => {
        try {
          customFlatListRef.current?.scrollToIndex({
            index,
            animated: true,
          });
        } catch {
          customFlatListRef.current?.scrollToEnd();
        }
      }, 500);
    }

    if (
      focusedPostNumber != null &&
      prevScreen === 'PostPreview' &&
      !topicDetailLoading
    ) {
      setParams({ prevScreen: '' });
      setReplyLoading(true);
      refetchData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevScreen, focusedPostNumber, topicDetailLoading]);

  const scrollIndex = postComments?.findIndex(
    ({ postNumber: itemPostNumber }) => postNumber === itemPostNumber,
  );

  useNotificationScroll({
    index: scrollIndex,
    virtualizedListRef: customFlatListRef,
    shouldScroll: !!postNumber && scrollIndex !== -1 && flatListReady,
  });

  const onPressAuthor = useCallback(
    (username: string) => {
      navigate('UserInformation', { username });
    },
    [navigate],
  );

  const navToFlag = (
    postId = postIdOnFocus,
    isPost = fromPost,
    flaggedAuthor = author,
  ) => {
    if (postId) {
      navigate('FlagPost', { postId, isPost, flaggedAuthor });
    }
  };
  
  const { reset: resetForm } = useFormContext<NewPostForm>();

  const navToPost = () => {
    if (!topic || !postIdOnFocus || !firstPost) {
      return;
    }
    const {
      firstPostId,
      id,
      title,
      selectedChannelId,
      selectedTag: selectedTagsIds,
    } = topic;

    const { polls } = firstPost;
    const focusedPost = getPost(postIdOnFocus);
    if (!focusedPost) {
      return;
    }
    const {
      content: oldContent,
      postNumber: focusedPostNumber,
      username,
      avatar,
    } = focusedPost;

    if (postIdOnFocus === firstPostId) {
      const newContentFilter = filterMarkdownContentPoll(oldContent);

      resetForm({
        title: title,
        raw: newContentFilter.filteredMarkdown,
        tags: selectedTagsIds,
        channelId: selectedChannelId,
        editPostId: firstPostId,
        editTopicId: id,
        polls:
          (polls &&
            newContentFilter.pollMarkdowns.length &&
            polls.map((data, index) => {
              return {
                title: data.title || '',
                minChoice: data.min || 0,
                maxChoice: data.max || 0,
                step: data.step || 0,
                results: RESULTS_DROPDOWN_OPTIONS.findIndex(
                  ({ value }) => value === data.results,
                ),
                chartType: data.chartType === 'bar' ? 0 : 1,
                isPublic: data.public ?? false,
                pollOptions: data.options.map(({ html }) => ({
                  option: html,
                })),
                groups: data.groups?.split(',') || [],
                pollChoiceType: data.type,
                closeDate: data.close ? new Date(data.close) : undefined,
                pollContent: newContentFilter.pollMarkdowns[index],
              };
            })) ||
          [],
      });

      setValue('oldContent', newContentFilter.filteredMarkdown);
      setValue('oldTitle', title);

      navigate('NewPost', {
        editedUser: { username, avatar },
      });
      return;
    }
    navigate('PostReply', {
      topicId,
      title,
      replyToPostId: postIdOnFocus,
      editPostId: postIdOnFocus,
      oldContent,
      focusedPostNumber,
      editedUser: { username, avatar },
    });
  };

  const onPressMore = useCallback(
    (params?: PressMoreParams) => {
      const mergedParams: PressMoreParams = params ?? {};
      let { id } = mergedParams;
      const {
        canFlag = !!(firstPost && firstPost.canFlag),
        canEdit = !!(firstPost && firstPost.canEdit),
        flaggedByCommunity = !!(firstPost && firstPost.hidden),
        fromPost = true,
        author,
      } = mergedParams;
      if (currentUserId && topic) {
        if (!id || typeof id !== 'number') {
          id = topic.firstPostId;
        }
        postIdOnFocusRef.current = id;
        setCanEditFocusPost(canEdit);
        setCanFlagFocusPost(canFlag);
        setFlaggedByCommunity(flaggedByCommunity);
        setShowActionSheet(true);
        if (author) {
          setAuthor(author);
        }
        setFromPost(fromPost);
      } else {
        errorHandlerAlert(LoginError, navigate);
      }
    },
    [currentUserId, navigate, firstPost, topic],
  );

  const actionItemOptions = () => {
    const options: ActionSheetProps['options'] = [];
    if (ios) {
      options.push({ label: t('Cancel') });
    }
    if (canEditFocusPost) {
      options.push({ label: t('Edit Post') });
    }
    if (!flaggedByCommunity) {
      options.push({
        label: canFlagFocusPost ? t('Flag') : t('Flagged'),
        disabled: !canFlagFocusPost,
      });
    }
    return options;
  };

  const actionItemOnPress = (btnIndex: number) => {
    switch (btnIndex) {
      case 0: {
        return canEditFocusPost ? navToPost() : navToFlag();
      }
      case 1:
        if (canEditFocusPost && !flaggedByCommunity) {

          return navToFlag();
        }
        return;
    }
  };

  const getPost = useCallback(
    (postId: number) => {
      if (!postComments) {
        return;
      }
      return postComments.find(({ id }) => id === postId) ?? firstPost;
    },
    [postComments, firstPost],
  );

  const onPressReply = useCallback(
    async (params?: PressReplyParams) => {
      if (!currentUserId) {
        return errorHandlerAlert(LoginError, navigate);
      }
      if (!topic) {
        return;
      }
      const draftKey = `topic_${topicId}`;
      const { data, error } = await checkPostDraft({
        variables: { draftKey },
      });

      if (data && !error) {
        const { checkPostDraft } = data;
        const { selectedChannelId, selectedTag } = topic;

        setValue('sequence', checkPostDraft.sequence);
        setValue('channelId', selectedChannelId);
        setValue('tags', selectedTag);

        if (
          checkPostDraft.draft &&
          checkPostDraft.draft.__typename === 'PostReplyDraft'
        ) {
          return checkDraftAlert({
            navigate,
            setValue,
            resetForm,
            checkPostDraft,
            deletePostDraft,
            replyToPostId: params?.replyToPostId,
            titleTopic: topic.title,
            topicId,
            channelId: selectedChannelId,
          });
        }
      } else {
        resetForm(FORM_DEFAULT_VALUES);
      }
      navigate('PostReply', {
        topicId,
        title: topic.title,
        replyToPostId: params?.replyToPostId,
      });
    },
    [
      currentUserId,
      topic,
      checkPostDraft,
      topicId,
      navigate,
      setValue,
      resetForm,
      deletePostDraft,
    ],
  );

const onPressReplyProps: ComponentProps<typeof PostDetailHeaderItem>['onPressReply'] = ({ postId }) => {
  if (postId) {
    onPressReply({ replyToPostId: postId });
  }
  };

  const keyExtractor = ({ id }: Post) => `post-${id}`;

  const renderItem = (
    { item }: PostReplyItem,
    { isItemLoading, onLayout }: RenderItemCustomOption,
  ) => {
    const { replyToPostNumber, canEdit, canFlag, hidden, id } = item;
    const replyToPostId =
      replyToPostNumber && replyToPostNumber > 0
        ? stream?.[replyToPostNumber - 1]
        : undefined;

    let isItemValid = false;
    if (canEdit) {
      isItemValid = true;
    }
    if (canFlag && !hidden) {
      isItemValid = true;
    }
    return (
      <NestedComment
        {...item}
        key={id}
        isLoading={isItemLoading}
        replyToPostId={replyToPostId}
        showOptions={isItemValid}
        style={styles.lowerContainer}
        onLayout={onLayout}
        onPressReply={onPressReply}
        onPressMore={onPressMore}
        onPressAuthor={onPressAuthor}
        onImagePress={handleImagePress} // Pass handler to NestedComment
        testIDStatus={`PostDetail:NestedComment:Author:EmojiStatus`}
      />
    );
  };
  
  const onScrollToIndexFailedHandler = ({ index }: OnScrollInfo) => {
    if (__DEV__) {
      console.warn(`PostDetail: failed to scroll to index ${index}`);
    }
  };

  const isLoading = (loading || replyLoading) && !error;
  if (error) {
    return (
      <LoadingOrError
        message={
          error
            ? errorHandler(error, true, t('topic'))
            : isLoading
            ? replyLoading
              ? t('Finishing your Reply')
              : undefined
            : t('Post is not available')
        }
      />
    );
  }

  return isLoading ? (
    <PostDetailSkeletonLoading isLoading={isLoading} />
  ) : (
    <>
      <SafeAreaView style={styles.container}>
        {showOptions && (
          <CustomHeader
            title=""
            rightIcon="More"
            onPressRight={onPressMore}
            noShadow
          />
        )}

        <CustomFlatList
          onLayout={() => {
            setFlatListReady(true);
          }}
          ref={customFlatListRef}
          data={postComments ?? []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={5}
          maxToRenderPerBatch={7}
          windowSize={10}
          ListHeaderComponent={
            <PostDetailHeaderItem
              topicId={topicId}
              postDetailContent={postDetailContent}
              content={content}
              mentionedUsers={mentionedUsers}
              isHidden={isHidden}
              onPressViewIgnoredContent={onPressViewIgnoredContent}
              onPressReply={onPressReplyProps}
              polls={firstPost?.polls}
              pollsVotes={firstPost?.pollsVotes}
              postId={firstPost?.id ?? firstPostId}
              onImagePress={handleImagePress} // Pass handler to HeaderItem
            />
          }
          onRefresh={hasOlderPost ? () => loadMoreComments(false) : refreshPost}
          refreshing={
            (loadingRefresh || isLoadingOlderPost) && !isLoadingNewerPost
          }
          refreshControlTintColor={colors.loading}
          onEndReachedThreshold={0.1}
          onEndReached={() => loadMoreComments(true)}
          ListFooterComponent={
            <FooterLoadingIndicator isHidden={!hasNewerPost} />
          }
          style={styles.scrollViewContainer}
          initialScrollIndex={0}
          onScrollToIndexFailed={onScrollToIndexFailedHandler}
          testID="PostDetail:List"
        />
        <TouchableOpacity
          style={styles.inputCommentContainer}
          onPress={() => onPressReply()}
          testID="PostDetail:Button:Reply"
        >
          <Text style={styles.inputComment}>{t('Write your reply here')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <TouchableOpacity>
        {stream && (
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
        )}
      </TouchableOpacity>

      {/* Render the modal */}
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContainer: {
    backgroundColor: colors.backgroundDarker,
    flex: 1,
  },
  lowerContainer: {
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.backgroundDarker,
  },
  inputComment: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    color: colors.textLighter,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.s,
    marginBottom: spacing.xxl,
    backgroundColor: colors.backgroundDarker,
    borderRadius: 4,
    padding: spacing.m,
  },
  inputCommentContainer: {
    backgroundColor: colors.background,
    paddingTop: spacing.l,
    marginHorizontal: spacing.xxl,
  },
  androidModalContainer: {
    paddingHorizontal: spacing.xxxl,
  },
}));