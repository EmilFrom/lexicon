import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Keyboard,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import {
  BottomMenu,
  CustomHeader,
  HeaderItem,
  KeyboardTextAreaScrollView,
  ListCreatePoll,
  MentionList,
  ModalHeader,
  TextArea,
  FullScreenImageModal
} from '../components';
import { NO_CHANNEL_FILTER, isNoChannelFilter } from '../constants';
import {
  Chip,
  Divider,
  Dot,
  Icon,
  Text,
  TextInput,
  TextInputType,
} from '../core-ui';
import { PostDraftType, UploadTypeEnum } from '../generatedAPI/server';
import {
  BottomMenuNavigationParams,
  BottomMenuNavigationScreens,
  bottomMenu,
  createReactNativeFile,
  errorHandlerAlert,
  existingPostIsValid,
  formatExtensions,
  getHyperlink,
  goBackWithoutSaveDraftAlert,
  insertHyperlink,
  mentionHelper,
  newPostIsValid,
  onKeyPress,
  parseInt,
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
  useSiteSettings,
  useStatelessUpload,
} from '../hooks';
import { makeStyles, useTheme } from '../theme';
import {
  CursorPosition,
  NewPostForm,
  RootStackNavProp,
  RootStackRouteProp,
} from '../types';
import { useModal } from '../utils';
import * as ImageManipulator from 'expo-image-manipulator';

type LocalImage = {
  uri: string;
  isUploading?: boolean;
  uploadedUrl?: string;
};

export default function NewPost() {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const handleImagePress = useCallback((uri: string) => {
      setFullScreenImage(uri);
    }, []);
  const { modal, setModal } = useModal();
  const styles = useStyles();
  const { spacing, colors } = useTheme();

  const storage = useStorage();
  const user = storage.getItem('user');
  const channels = storage.getItem('channels');

  const defaultChannelId = channels?.[0].id || NO_CHANNEL_FILTER.id;

  const { canCreateTag, canTagTopics, authorizedExtensions } = useSiteSettings({
    onCompleted: ({
      site: {
        uncategorizedCategoryId,
        siteSettings: { defaultComposerCategory, allowUncategorizedTopics },
      },
    }) => {
      if (isNoChannelFilter(selectedChannel)) {
        const parsed = parseInt(defaultComposerCategory);
        if (parsed) {
          setValue('channelId', parsed);
        } else {
          setValue(
            'channelId',
            allowUncategorizedTopics
              ? uncategorizedCategoryId
              : defaultChannelId,
          );
        }
      }
    },
  });

  const extensions = authorizedExtensions?.split('|');
  const normalizedExtensions = formatExtensions(extensions);

  const ios = Platform.OS === 'ios';

  const navigation = useNavigation<RootStackNavProp<'NewPost'>>();
  const { navigate, goBack } = navigation;

  const {
    control,
    handleSubmit,
    formState: { errors, dirtyFields },
    formState,
    setValue,
    getValues,
    watch,
    reset: resetForm,
    getFieldState,
  } = useFormContext<NewPostForm>();

  const { params } = useRoute<RootStackRouteProp<'NewPost'>>();
  const memoizedFormParams = useMemo(() => {
    const values = getValues();

    return {
      editPostId: values?.editPostId,
      editTopicId: values?.editTopicId,
      oldContent: values?.oldContent || '',
      oldTitle: values?.oldTitle || '',
      editedUser: params?.editedUser,
      hyperlinkUrl: params?.hyperlinkUrl || '',
      hyperlinkTitle: params?.hyperlinkTitle || '',
      imageUri: params?.imageUri || '',
      sequence: values?.sequence,
      isDraft: values.isDraft ?? false,
    };
  }, [params, getValues]);
  const {
    editPostId,
    editTopicId,
    oldContent,
    oldTitle,
    editedUser,
    imageUri,
    sequence,
    isDraft,
  } = memoizedFormParams;
  const { hyperlinkUrl, hyperlinkTitle } = memoizedFormParams;

  /**
   * Using the watch function to update the values of the channel and tags fields when changes occur in the form.
   * This prevents a bug where, after selecting a channel in the channel scene, the value of selectedChannel does not change because it does not trigger a re-render.
   */

  const selectedChannel: number = watch('channelId');

  const selectedTags: Array<string> = watch('tags');
  const polls = watch('polls');
  const rawContent = watch('raw');

  const [editPostType, setEditPostType] = useState('');
  const [isKeyboardShow, setKeyboardShow] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(true);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [showUserList, setShowUserList] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState('');
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);

  const kasv = useKASVWorkaround();

  const newPostRef = useRef<TextInputType>(null);

  const { upload } = useStatelessUpload();

  useEffect(() => {
    setModal(true);
  }, [setModal]);

  const { mentionMembers } = useMention(
    mentionKeyword,
    showUserList,
    setMentionLoading,
  );

  useEffect(() => {
    if (hyperlinkUrl) {
      const { newUrl, newTitle } = getHyperlink(hyperlinkUrl, hyperlinkTitle);
      const { raw } = getValues();
      const result = insertHyperlink(raw, newTitle, newUrl);
      setValue('raw', result);
    }
  }, [getValues, setValue, hyperlinkUrl, hyperlinkTitle]);

  const onPressSelectChannel = () => {
    navigate('Channels', { prevScreen: 'NewPost' });
  };

  const onPressSelectTags = () => {
    navigate('Tags', {
      canCreateTag: canCreateTag || false,
    });
  };

  const doneCreatePost = handleSubmit(() => {
    navigate('PostPreview', {
      reply: false,
      postData: { topicId: editTopicId || 0 },
      editPostId:
        editPostType === 'Post' || editPostType === 'Both'
          ? editPostId
          : undefined,
      editTopicId:
        editPostType === 'Topic' || editPostType === 'Both'
          ? editTopicId
          : undefined,
      editedUser,
      focusedPostNumber: editTopicId ? 1 : undefined,
    });
  });

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

  // debounce save draft new post every time type text input
  const { debounceSaveDraft } = useAutoSavePostDraft({
    createPostDraft,
    getValues,
    type: PostDraftType.NewTopic,
    skip: !!(editPostId || editTopicId),
  });

  useAutoSaveManager({ debounceSaveDraft });

  const processedImageUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUri || processedImageUriRef.current === imageUri) {
      return;
    }
    processedImageUriRef.current = imageUri;
    setLocalImages((prev) => [...prev, { uri: imageUri }]);
  }, [imageUri]);

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
    prevScreen: 'NewPost',
    extensions: normalizedExtensions,
  });

  const onPreview = handleSubmit(async (data) => {
    Keyboard.dismiss();

    setLocalImages((prev) =>
      prev.map((image) => ({ ...image, isUploading: true })),
    );

    try {
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

      const uploadedUrls = await Promise.all(uploadPromises);
      const markdownLinks = uploadedUrls
        .filter((url) => url)
        .map((url) => `![image](${url})`)
        .join('\n');

      setValue('raw', `${getValues('raw')}\n${markdownLinks}`);
      setLocalImages([]);

      navigate('PostPreview', {
        reply: false,
        postData: { topicId: editTopicId || 0 },
        editPostId:
          editPostType === 'Post' || editPostType === 'Both'
            ? editPostId
            : undefined,
        editTopicId:
          editPostType === 'Topic' || editPostType === 'Both'
            ? editTopicId
            : undefined,
        editedUser,
        focusedPostNumber: editTopicId ? 1 : undefined,
      });
    } catch (error) {
      errorHandlerAlert(String(error));
      setLocalImages((prev) =>
        prev.map((image) => ({ ...image, isUploading: false })),
      );
    }
  });

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        /**
         * Add condition only when change title or content we show alert
         */
        if (
          (!dirtyFields.title && !dirtyFields.raw && !dirtyFields.polls) ||
          !modal ||
          localImages.some((image) => image.isUploading)
        ) {
          return;
        }
        e.preventDefault();

        // make sure not show save draft alert when edit post
        /**
         * Use an explicit conditional instead of a ternary expression so the intent
         * is clear to ESLint and future readers.
         */
        if (!editPostId || !editTopicId) {
          saveAndDiscardPostDraftAlert({
            deletePostDraft,
            createPostDraft,
            event: e,
            navigation,
            getValues,
            resetForm,
            draftType: PostDraftType.NewTopic,
            debounceSaveDraft,
          });
        } else {
          goBackWithoutSaveDraftAlert({ event: e, navigation, resetForm });
        }
      }),
    [
      modal,
      navigation,
      resetForm,
      createPostDraft,
      deletePostDraft,
      sequence,
      getValues,
      selectedChannel,
      selectedTags,
      isDraft,
      dirtyFields,
      editPostId,
      editTopicId,
      debounceSaveDraft,
      localImages,
    ],
  );

  const setMentionValue = (text: string) => {
    setValue('raw', text);
  };

  const postValidity = useMemo(() => {
    const uploadsInProgress = localImages.filter(
      (image) => image.isUploading,
    ).length;
    if (editPostId) {
      const { isValid } = existingPostIsValid({
        uploadsInProgress,
        title: getValues('title'),
        oldTitle,
        content: rawContent,
        oldContent,
        polls,
        getFieldState,
        formState,
      });
      return isValid;
    }
    return newPostIsValid(
      getValues('title'),
      rawContent,
      uploadsInProgress,
      polls,
    );
  }, [
    editPostId,
    getValues,
    localImages,
    oldContent,
    oldTitle,
    polls,
    rawContent,
    selectedTags,
    getFieldState,
    formState,
  ]);

  const Header = () =>
    ios ? (
      <ModalHeader
        title={editTopicId || editPostId ? t('Edit Post') : t('New Post')}
        left={
          <HeaderItem
            label={t('Cancel')}
            left
            onPressItem={() => {
              goBack();
            }}
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
    ) : (
      <CustomHeader
        title={editTopicId || editPostId ? t('Edit Post') : t('New Post')}
        rightTitle={t('Next')}
        isLoading={localImages.some((image) => image.isUploading)}
        disabled={
          !postValidity ||
          loadingCreateAndUpdatePostDraft ||
          localImages.some((image) => image.isUploading)
        }
        onPressRight={onPreview}
      />
    );

  return (
    <SafeAreaView style={styles.container} testID="NewPost:SafeAreaView">
      <Header />
      <KeyboardTextAreaScrollView
        {...kasv.props}
        bottomMenu={
          <View>
            <MentionList
              showUserList={showUserList}
              members={mentionMembers}
              mentionLoading={mentionLoading}
              rawText={getValues('raw')}
              textRef={newPostRef}
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
              showLeftMenu={showLeftMenu}
            />
          </View>
        }
      >
        <>
          <View style={styles.titleInputContainer}>
            <Controller
              name="title"
              defaultValue={oldTitle}
              rules={{ required: true }}
              control={control}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  autoCorrect
                  value={value}
                  label={t('Title')}
                  placeholder={t("What's on your mind?")}
                  onChangeText={(text) => {
                    const { raw: content, polls } = getValues();

                    if (editTopicId || editPostId) {
                      const { editType } = existingPostIsValid({
                        uploadsInProgress: localImages.filter(
                          (image) => image.isUploading,
                        ).length,
                        title: text,
                        content,
                        getFieldState,
                        formState,
                        polls,
                      });
                      setEditPostType(editType);
                    }
                    onChange(text);
                    debounceSaveDraft();
                  }}
                  onFocus={() => setShowLeftMenu(false)}
                  error={errors.title != null}
                  testID="NewPost:TextInput:Title"
                  multiline
                  textAlignVertical="top"
                />
              )}
            />
          </View>

          <View style={[styles.formContainer, styles.row]}>
            <Text style={styles.label}>{t('Channel')}</Text>
            <TouchableOpacity
              style={styles.row}
              onPress={onPressSelectChannel}
              testID="NewPost:Button:Channel"
            >
              <Dot
                variant="large"
                color={`#${
                  channels?.find(({ id }) => id === selectedChannel)?.color
                }`}
                style={{ marginEnd: spacing.m }}
              />
              <Text color="textNormal">
                {channels?.find(({ id }) => id === selectedChannel)?.name}
              </Text>
              <Icon
                name="ChevronRight"
                size="l"
                style={styles.iconRight}
                color={colors.textLighter}
              />
            </TouchableOpacity>
          </View>

          <Divider horizontalSpacing="xxl" />

          {canTagTopics && (
            <>
              <View style={[styles.formContainer, styles.row]}>
                <Text style={[styles.label, { flex: 1 }]}>{t('Tags')}</Text>
                <TouchableOpacity
                  style={[styles.row, { flex: 3, justifyContent: 'flex-end' }]}
                  onPress={onPressSelectTags}
                >
                  <View style={styles.tagsViewContainer}>
                    {selectedTags.length ? (
                      <ScrollView
                        scrollEnabled={false}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.row}
                      >
                        {selectedTags.map((tag, index) => {
                          const spacingStyle = { marginEnd: spacing.m };
                          return (
                            <Chip
                              key={tag}
                              content={tag}
                              style={
                                index !== selectedTags.length - 1
                                  ? spacingStyle
                                  : undefined
                              }
                            />
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text
                        style={[
                          styles.label,
                          { color: colors.darkTextLighter },
                        ]}
                      >
                        {t('Add a tag')}
                      </Text>
                    )}
                  </View>
                  <Icon
                    name="ChevronRight"
                    size="l"
                    style={styles.iconRight}
                    color={colors.textLighter}
                  />
                </TouchableOpacity>
              </View>
              <Divider horizontalSpacing="xxl" />
            </>
          )}

          <View style={styles.localImagesContainer}>
          {localImages.map((image, index) => (
            <TouchableOpacity key={index} onPress={() => handleImagePress(image.uri)}>
              <View style={styles.localImageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.localImage} />
                {/* ... remove button and uploading overlay ... */}
              </View>
            </TouchableOpacity>
          ))}
           </View>

          <ListCreatePoll
            polls={polls || []}
            setValue={setValue}
            navigate={navigate}
            editPostId={editPostId}
            prevScreen="NewPost"
          />

          <Controller
            name="raw"
            defaultValue={oldContent}
            rules={{ required: polls?.length === 0 }}
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextArea
                value={value}
                isKeyboardShow={isKeyboardShow}
                inputRef={newPostRef}
                placeholder={t('Enter a description')}
                selectionCursor={cursorPosition}
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

                  const { title, polls } = getValues();

                  if (editTopicId || editPostId) {
                    const { editType } = existingPostIsValid({
                      uploadsInProgress: localImages.filter(
                        (image) => image.isUploading,
                      ).length,
                      title,
                      content: text,
                      getFieldState,
                      formState,
                      polls,
                    });
                    setEditPostType(editType);
                  }
                }}
                onFocus={(event) => {
                  kasv.scrollToFocusedInput(event);
                  setKeyboardShow(true);
                  setShowLeftMenu(true);
                }}
                onSelectedChange={(cursor) => {
                  setCursorPosition(cursor);
                }}
                onBlur={() => {
                  setKeyboardShow(false);
                }}
                style={styles.spacingHorizontal}
                mentionToggled={showUserList}
                testID="NewPost:TextArea"
              />
            )}
          />
        </>
      </KeyboardTextAreaScrollView>
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContainer: {
    height: 52,
    marginHorizontal: spacing.xxl,
    justifyContent: 'space-between',
  },
  spacingHorizontal: {
    marginHorizontal: spacing.xxl,
  },
  titleInputContainer: {
    paddingTop: spacing.xl,
    marginHorizontal: spacing.xxl,
  },
  tagsViewContainer: { flex: 1, alignItems: 'flex-end' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconRight: { marginStart: spacing.m },
  label: { color: colors.textLight },
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
