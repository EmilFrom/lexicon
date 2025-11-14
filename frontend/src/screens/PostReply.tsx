import { useNavigation, useRoute } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Keyboard, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import { client } from '../api/client';
import {
  BottomMenu,
  CustomHeader,
  HeaderItem,
  KeyboardTextAreaScrollView,
  ListCreatePoll,
  LocalRepliedPost,
  MentionList,
  ModalHeader,
  TextArea,
} from '../components';
import { FORM_DEFAULT_VALUES } from '../constants';
import { Divider, IconWithLabel, TextInputType } from '../core-ui';
import {
  PostDraftType,
  PostFragment,
  PostFragmentDoc,
  UploadTypeEnum,
} from '../generatedAPI/server';
import {
  BottomMenuNavigationParams,
  BottomMenuNavigationScreens,
  bottomMenu,
  createReactNativeFile,
  errorHandlerAlert,
  existingPostIsValid,
  formatExtensions,
  getHyperlink,
  getReplacedImageUploadStatus,
  goBackWithoutSaveDraftAlert,
  insertHyperlink,
  insertImageUploadStatus,
  mentionHelper,
  newPostIsValid,
  onKeyPress,
  saveAndDiscardPostDraftAlert,
  useStorage,
} from '../helpers';
import {
  useAutoSaveManager,
  useAutoSavePostDraft,
  useCreateAndUpdatePostDraft,
  useDeletePostDraft,
  useKASVWorkaround,
  useMention,
  usePost,
  useSiteSettings,
  useStatefulUpload,
} from '../hooks';
import { makeStyles, useTheme } from '../theme';
import {
  CursorPosition,
  NewPostForm,
  RootStackNavProp,
  RootStackParamList,
  RootStackRouteProp,
} from '../types';
import { useModal } from '../utils';

export default function PostReply() {
  const { modal, setModal } = useModal();
  const styles = useStyles();
  const { colors } = useTheme();

  const navigation = useNavigation<RootStackNavProp<'PostReply'>>();
  const { navigate, goBack } = navigation; // Corrected: useNavigation is only called once

  const { params } = useRoute<RootStackRouteProp<'PostReply'>>();

  // --- FIX 1: Replace the entire useRef anti-pattern with useState and useEffect ---
  const [persistedParams, setPersistedParams] =
    useState<RootStackParamList['PostReply']>(params);

  useEffect(() => {
    // This effect safely merges new incoming params into our persistent state
    // without violating the rules of hooks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistedParams((prevParams) => ({ ...prevParams, ...params }));
  }, [params]);

  // --- FIX 2: All variables are now safely derived from state, NOT a ref ---
  const {
    title,
    topicId,
    replyToPostId,
    focusedPostNumber,
    editPostId,
    oldContent = '',
    editedUser,
    imageUri = '',
    hyperlinkTitle = '',
    hyperlinkUrl,
  } = persistedParams;
  // --- END OF MAJOR FIX ---

  const replyingTo = useMemo(() => {
    if (!replyToPostId) return null;
    return client.readFragment<PostFragment>({
      id: `Post:${replyToPostId}`,
      fragment: PostFragmentDoc,
      fragmentName: 'PostFragment',
    });
  }, [replyToPostId]);

  const ios = Platform.OS === 'ios';
  const repliedPost = useMemo(() => {
    if (replyToPostId) {
      return <LocalRepliedPost hideAuthor replyToPostId={replyToPostId} />;
    }
    return undefined;
  }, [replyToPostId]);

  const storage = useStorage();
  const user = storage.getItem('user');

  const { authorizedExtensions } = useSiteSettings();
  const extensions = authorizedExtensions?.split('|');
  const normalizedExtensions = formatExtensions(extensions);

  const kasv = useKASVWorkaround();

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState,
  } = useFormContext<NewPostForm>();
  const polls = watch('polls');
  const rawContent = watch('raw');

  const [showUserList, setShowUserList] = useState(false);
  const [currentUploadToken, setCurrentUploadToken] = useState(1);
  const { upload, tempArray, setTempArray, completedToken } = useStatefulUpload(
    [],
    currentUploadToken,
  );
  const uploadsInProgress = tempArray.filter((image) => !image.done).length;
  const [isKeyboardShow, setKeyboardShow] = useState(false);

  const debounced = useDebouncedCallback(
    ({ value, token }: { value: string; token: number }) => {
      if (tempArray[token - 1]) {
        const newText = getReplacedImageUploadStatus(
          value,
          token,
          tempArray[token - 1].link,
        );
        setValue('raw', newText);
      }
    },
    1500,
  );

  const postReplyRef = useRef<TextInputType>(null);

  const enqueueImageUpload = useCallback(
    (localUri: string) => {
      if (!localUri || !user) {
        return;
      }

      const placeholderIndex = tempArray.length + 1;
      setTempArray((prev) => [...prev, { link: '', done: false }]);

      const reactNativeFile = createReactNativeFile(localUri);
      if (!reactNativeFile) {
        return;
      }

      const { raw } = getValues();
      const result = insertImageUploadStatus(
        raw,
        cursorPosition.start,
        placeholderIndex,
      );
      setValue('raw', result);
      setCurrentUploadToken((prevToken) => {
        const token = prevToken;
        upload({
          variables: {
            input: {
              file: reactNativeFile,
              userId: user.id || 0,
              type: UploadTypeEnum.Composer,
              token,
            },
          },
        });
        return prevToken + 1;
      });
    },
    [
      cursorPosition.start,
      getValues,
      setTempArray,
      setValue,
      tempArray.length,
      upload,
      user,
    ],
  );

  const { createPostDraft, loading: loadingCreateAndUpdatePostDraft } =
    useCreateAndUpdatePostDraft({
      onError: (error) => {
        errorHandlerAlert(error);
      },
      onCompleted: ({ createAndUpdatePostDraft }) => {
        setValue('draftKey', createAndUpdatePostDraft?.draftKey);
        setValue('sequence', createAndUpdatePostDraft?.draftSequence);
        setValue('isDraft', true);
      },
    });
  const { deletePostDraft } = useDeletePostDraft();
  const { getPost, loading: loadingRepliedPost } = usePost();

  const { debounceSaveDraft } = useAutoSavePostDraft({
    createPostDraft,
    getValues,
    type: PostDraftType.PostReply,
    topicId,
    replyToPostId,
    skip: !!editPostId,
  });

  useAutoSaveManager({ debounceSaveDraft });

  useEffect(() => {
    const { isDraft } = getValues();
    if (replyToPostId && isDraft) {
      getPost({ variables: { postId: replyToPostId } });
    }
  }, [getPost, getValues, replyToPostId]);

  useEffect(() => {
    if (!completedToken) {
      return;
    }
    const { raw } = getValues();
    debounced({ value: raw, token: completedToken });
  }, [completedToken, debounced, getValues]);

  const { mentionMembers } = useMention(
    mentionKeyword,
    showUserList,
    setMentionLoading,
  );

  const processedImageUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUri || processedImageUriRef.current === imageUri) {
      return;
    }
    processedImageUriRef.current = imageUri;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    enqueueImageUpload(imageUri);
  }, [enqueueImageUpload, imageUri]);

  useEffect(() => {
    setModal(true);
  }, [setModal]);

  useEffect(() => {
    if (hyperlinkUrl) {
      const { newUrl, newTitle } = getHyperlink(hyperlinkUrl, hyperlinkTitle);
      const postReplyObject = getValues();
      const result = insertHyperlink(postReplyObject.raw, newTitle, newUrl);
      setValue('raw', result);
    }
  }, [hyperlinkTitle, hyperlinkUrl, getValues, setValue]);

  const onNavigate = (
    screen: BottomMenuNavigationScreens,
    params: BottomMenuNavigationParams,
  ) => {
    navigate(screen, params);
  };

  const {
    onInsertImage,
    onInsertLink,
    onInsertPoll,
    onFontFormatting,
    onQuote,
    onListFormatting,
    onCollapsibleFormatting,
  } = bottomMenu({
    isKeyboardShow,
    user,
    navigate: onNavigate,
    prevScreen: 'PostReply',
    extensions: normalizedExtensions,
    title,
    topicId,
    replyToPostId,
  });

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (
          ((!formState.dirtyFields.raw && !formState.dirtyFields.polls) ||
            !modal) &&
          uploadsInProgress < 1
        ) {
          reset(FORM_DEFAULT_VALUES);
          return;
        }
        e.preventDefault();

        if (!editPostId) {
          saveAndDiscardPostDraftAlert({
            deletePostDraft,
            createPostDraft,
            event: e,
            navigation,
            getValues,
            resetForm: reset,
            draftType: PostDraftType.PostReply,
            topicId,
            replyToPostId,
            debounceSaveDraft,
          });
        } else {
          goBackWithoutSaveDraftAlert({
            resetForm: reset,
            event: e,
            navigation,
          });
        }
      }),
    [
      modal,
      navigation,
      uploadsInProgress,
      reset,
      getValues,
      deletePostDraft,
      createPostDraft,
      topicId,
      formState.dirtyFields.raw,
      replyToPostId,
      formState.dirtyFields.polls,
      editPostId,
      debounceSaveDraft,
    ],
  );

  const onPreview = handleSubmit(() => {
    Keyboard.dismiss();
    setValue('title', title);
    navigate('PostPreview', {
      reply: true,
      postData: { topicId, postNumber: replyingTo?.postNumber, replyToPostId },
      focusedPostNumber,
      editPostId,
      editedUser,
    });
  });

  const postValidity = useMemo(() => {
    if (editPostId) {
      const { isValid } = existingPostIsValid({
        uploadsInProgress,
        title,
        oldTitle: title,
        content: rawContent,
        oldContent,
        polls,
      });
      return isValid;
    }
    return newPostIsValid(title, rawContent, uploadsInProgress, polls);
  }, [editPostId, uploadsInProgress, oldContent, polls, rawContent, title]);

  const setMentionValue = (text: string) => {
    setValue('raw', text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title={editPostId ? t('Edit Post') : t('Reply')}
        rightTitle={t('Next')}
        onPressRight={onPreview}
        disabled={!postValidity || loadingCreateAndUpdatePostDraft}
        noShadow
      />
      {ios && (
        <ModalHeader
          title={editPostId ? t('Edit Post') : t('Reply')}
          left={
            <HeaderItem
              label={t('Cancel')}
              onPressItem={() => {
                goBack();
              }}
              left
              disabled={loadingCreateAndUpdatePostDraft}
            />
          }
          right={
            <HeaderItem
              label={t('Next')}
              onPressItem={onPreview}
              disabled={!postValidity || loadingCreateAndUpdatePostDraft}
            />
          }
        />
      )}
      <KeyboardTextAreaScrollView
        {...kasv.props}
        bottomMenu={
          <View>
            <MentionList
              showUserList={showUserList}
              members={mentionMembers}
              mentionLoading={mentionLoading}
              rawText={getValues('raw')}
              textRef={postReplyRef}
              setMentionValue={setMentionValue}
              setShowUserList={setShowUserList}
            />
            <BottomMenu
              onInsertImage={onInsertImage}
              onInsertLink={onInsertLink}
              onInsertPoll={onInsertPoll}
              onBold={() => {
                const { raw } = getValues();
                onFontFormatting({
                  content: raw,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                  type: 'Bold',
                });
              }}
              onItalic={() => {
                const { raw } = getValues();
                onFontFormatting({
                  content: raw,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                  type: 'Italic',
                });
              }}
              onQuote={() => {
                const { raw: content } = getValues();

                onQuote({
                  content,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                });
              }}
              onBulletedList={() => {
                const { raw } = getValues();
                onListFormatting({
                  content: raw,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                  type: 'Bullet',
                });
              }}
              onNumberedList={() => {
                const { raw } = getValues();
                onListFormatting({
                  content: raw,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                  type: 'Number',
                });
              }}
              onCollapsible={() => {
                const { raw } = getValues();
                onCollapsibleFormatting({
                  content: raw,
                  cursorPosition,
                  setCursorPosition,
                  setValue,
                });
              }}
            />
          </View>
        }
      >
        <IconWithLabel
          icon="Replies"
          color={colors.textLighter}
          label={title}
          fontStyle={styles.title}
          style={styles.titleContainer}
          numberOfLines={1}
        />
        <Divider style={styles.spacingBottom} horizontalSpacing="xxl" />
        {!loadingRepliedPost && repliedPost}
        <ListCreatePoll
          polls={polls || []}
          setValue={setValue}
          navigate={navigate}
          prevScreen="PostReply"
        />
        <Controller
          name="raw"
          defaultValue={oldContent}
          rules={{ required: polls?.length === 0 }}
          control={control}
          render={({ field: { onChange, value } }) => (
            <TextArea
              value={value}
              large
              isKeyboardShow={isKeyboardShow}
              inputRef={postReplyRef}
              placeholder={t('Share your thoughts')}
              onKeyPress={(event) => {
                onKeyPress({
                  event,
                  text: value,
                  cursorPosition,
                  onChange,
                });
              }}
              onChangeValue={(text) => {
                mentionHelper(
                  text,
                  cursorPosition,
                  setShowUserList,
                  setMentionLoading,
                  setMentionKeyword,
                );
                onChange(text);
                debounced({
                  value: text,
                  token: currentUploadToken,
                });

                debounceSaveDraft();
              }}
              onFocus={(event) => {
                setKeyboardShow(true);
                kasv.scrollToFocusedInput(event);
              }}
              onBlur={() => {
                setKeyboardShow(false);
              }}
              onSelectedChange={(cursor) => {
                setCursorPosition(cursor);
              }}
              style={styles.markdownContainer}
              mentionToggled={showUserList}
              selectionCursor={cursorPosition}
              testID="PostReply:TextArea"
            />
          )}
        />
      </KeyboardTextAreaScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, fontVariants, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: spacing.xxl,
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
  },
  title: {
    flex: 1,
    ...fontVariants.semiBold,
  },
  markdownContainer: {
    paddingHorizontal: spacing.xxl,
  },
  spacingBottom: {
    marginBottom: spacing.xl,
  },
}));
