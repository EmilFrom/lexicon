import { useNavigation, useRoute } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Keyboard,
  Platform,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  FullScreenImageModal,
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
  // removed getReplacedImageUploadStatus
  goBackWithoutSaveDraftAlert,
  insertHyperlink,
  // removed insertImageUploadStatus
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
  useStatelessUpload,
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
import * as ImageManipulator from 'expo-image-manipulator';

type LocalImage = {
  uri: string;
  isUploading?: boolean;
  uploadedUrl?: string;
};

export default function PostReply() {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const handleImagePress = useCallback((uri: string) => {
    setFullScreenImage(uri);
  }, []);
  const { modal, setModal } = useModal();
  const styles = useStyles();
  const { colors } = useTheme();

  const navigation = useNavigation<RootStackNavProp<'PostReply'>>();
  const { navigate, goBack } = navigation;

  const { params } = useRoute<RootStackRouteProp<'PostReply'>>();

  const [persistedParams, setPersistedParams] =
    useState<RootStackParamList['PostReply']>(params);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistedParams((prevParams) => ({ ...prevParams, ...params }));
  }, [params]);

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
  const { upload } = useStatelessUpload();
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [isKeyboardShow, setKeyboardShow] = useState(false);

  const postReplyRef = useRef<TextInputType>(null);

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
    setLocalImages((prev) => [...prev, { uri: imageUri }]);
  }, [imageUri]);

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
    if (screen === 'HyperLink') {
      navigate(screen, params as RootStackParamList['HyperLink']);
    } else if (screen === 'NewPoll') {
      navigate(screen, params as RootStackParamList['NewPoll']);
    }
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
          (!formState.dirtyFields.raw && !formState.dirtyFields.polls) ||
          !modal
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

  const onPreview = handleSubmit(async () => {
    Keyboard.dismiss();
    setValue('title', title);

    setLocalImages((prev) =>
      prev.map((image) => ({ ...image, isUploading: true })),
    );

    const uploadPromises = localImages.map(async (image) => {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        image.uri,
        [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const reactNativeFile = createReactNativeFile(manipulatedImage.uri);
      if (!reactNativeFile || !user) {
        throw new Error('File creation failed');
      }
      const result = await upload({
        variables: {
          input: {
            file: reactNativeFile,
            userId: user.id || 0,
            type: UploadTypeEnum.Composer,
          },
        },
      });
      const shortUrl = result.data?.upload.shortUrl;
      return shortUrl;
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const markdownLinks = uploadedUrls
        .filter((url) => url)
        .map((url) => `![image](${url})`)
        .join('\n');

      setValue('raw', `${getValues('raw')}\n${markdownLinks}`);
      setLocalImages([]);

      navigate('PostPreview', {
        reply: true,
        postData: {
          topicId,
          postNumber: replyingTo?.postNumber,
          replyToPostId,
        },
        focusedPostNumber,
        editPostId,
        editedUser,
      });
    } catch (error) {
      errorHandlerAlert((error as Error).message);
      setLocalImages((prev) =>
        prev.map((image) => ({ ...image, isUploading: false })),
      );
    }
  });

  const postValidity = useMemo(() => {
    if (editPostId) {
      const { isValid } = existingPostIsValid({
        uploadsInProgress: localImages.filter((image) => image.isUploading)
          .length,
        title,
        oldTitle: title,
        content: rawContent,
        oldContent,
        polls,
      });
      return isValid;
    }
    return newPostIsValid(
      title,
      rawContent,
      localImages.filter((image) => image.isUploading).length,
      polls,
    );
  }, [editPostId, localImages, oldContent, polls, rawContent, title]);

  const setMentionValue = (text: string) => {
    setValue('raw', text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title={editPostId ? t('Edit Post') : t('Reply')}
        rightTitle={t('Next')}
        onPressRight={onPreview}
        isLoading={localImages.some((image) => image.isUploading)}
        disabled={
          !postValidity ||
          loadingCreateAndUpdatePostDraft ||
          localImages.some((image) => image.isUploading)
        }
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
              loading={localImages.some((image) => image.isUploading)}
              disabled={
                !postValidity ||
                loadingCreateAndUpdatePostDraft ||
                localImages.some((image) => image.isUploading)
              }
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
        <View style={styles.localImagesContainer}>
          {localImages.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleImagePress(image.uri)}
            >
              <View style={styles.localImageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.localImage} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <ListCreatePoll
          polls={polls || []}
          setValue={setValue}
          navigate={navigate}
          editPostId={editPostId}
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
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
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
  localImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.m,
  },
  localImageWrapper: {
    position: 'relative',
    marginRight: spacing.m,
    marginBottom: spacing.m,
  },
  localImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
}));
