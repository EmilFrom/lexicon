import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Platform,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebouncedCallback } from 'use-debounce';

import {
  BottomMenu,
  CustomHeader,
  HeaderItem,
  KeyboardTextAreaScrollView,
  ListCreatePoll,
  LoadingOrError,
  MentionList,
  ModalHeader,
  TextArea,
} from '../components';
import { FORM_DEFAULT_VALUES, refetchQueriesPostDraft } from '../constants';
import { Divider, Icon, Text, TextInputType } from '../core-ui';
import {
  MessageListDocument,
  PostDraftType,
  UploadTypeEnum,
} from '../generatedAPI/server';
import {
  bottomMenu,
  BottomMenuNavigationParams,
  BottomMenuNavigationScreens,
  createReactNativeFile,
  errorHandlerAlert,
  formatExtensions,
  getHyperlink,
  getReplacedImageUploadStatus,
  insertHyperlink,
  insertImageUploadStatus,
  mentionHelper,
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
  useNewMessage,
  useSiteSettings,
  useStatefulUpload,
  useStatelessUpload,
} from '../hooks';
import { makeStyles, useTheme } from '../theme';
import {
  CursorPosition,
  Image,
  NewPostForm,
  PollFormContextValues,
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

export default function NewMessage() {
  const { modal, setModal } = useModal();
  const styles = useStyles();
  const { colors, spacing } = useTheme();

  const storage = useStorage();
  const user = storage.getItem('user');

  const { authorizedExtensions } = useSiteSettings();
  const extensions = authorizedExtensions?.split('|');
  const normalizedExtensions = formatExtensions(extensions);

  const ios = Platform.OS === 'ios';

  const navigation = useNavigation<RootStackNavProp<'NewMessage'>>();
  const { navigate, goBack, dispatch } = navigation;

  const { params } = useRoute<RootStackRouteProp<'NewMessage'>>();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { dirtyFields, isValid },
    watch,
    reset: resetForm,
  } = useFormContext<NewPostForm>();

  const users: Array<string> | undefined = watch('messageTargetSelectedUsers');
  const polls: Array<PollFormContextValues> | undefined = watch('polls');
  const { isDraft } = getValues();

  const memoizedLinkParams = useMemo(() => {
    return {
      hyperlinkUrl: params?.hyperlinkUrl || '',
      hyperlinkTitle: params?.hyperlinkTitle || '',
      imageUri: params?.imageUri || '',
    };
  }, [params]);
  let { hyperlinkUrl, hyperlinkTitle } = memoizedLinkParams;
  const { imageUri } = memoizedLinkParams;

  const kasv = useKASVWorkaround();

  const [imagesArray, setImagesArray] = useState<Array<Image>>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<string>>([]);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [uri, setUri] = useState('');
  const [isKeyboardShow, setKeyboardShow] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(true);
  const [currentUploadToken, setCurrentUploadToken] = useState(1);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);

  const uploadsInProgress = imagesArray.filter((image) => !image.done).length;

  const debounced = useDebouncedCallback(
    ({ value, token }: { value: string; token: number }) => {
      if (imagesArray[token - 1]) {
        const newText = getReplacedImageUploadStatus(
          value,
          token,
          imagesArray[token - 1].link,
        );

        setValue('raw', newText);
      }
    },
    1500,
  );

  const username = storage.getItem('user')?.username ?? '';

  const navToMessages = () => {
    dispatch((state) => {
      const newRoutesFilter = state.routes.filter(
        ({ name }) => name !== 'NewMessage',
      );

      let routesMap = [...newRoutesFilter];

      if (
        isDraft &&
        state.routes[state.routes.length - 2].name === 'PostDraft'
      ) {
        routesMap = [
          ...routesMap,
          {
            name: 'Messages',
            key: 'messages',
          },
        ];
      }

      return CommonActions.reset({
        ...state,
        routes: routesMap,
        index: routesMap.length - 1,
      });
    });
  };

  const { upload, tempArray, completedToken } = useStatefulUpload(
    imagesArray,
    currentUploadToken,
  );

  const { newMessage, loading: newMessageLoading } = useNewMessage({
    onCompleted: () => {
      resetForm(FORM_DEFAULT_VALUES);
      navToMessages();
    },
    onError: (error) => {
      errorHandlerAlert(error);
    },
    refetchQueries: [
      {
        query: MessageListDocument,
        variables: { username },
      },
      ...(isDraft ? refetchQueriesPostDraft : []),
    ],
  });

  useEffect(() => {
    const { raw } = getValues();
    if (completedToken) {
      debounced({ value: raw, token: completedToken });
    }
    setImagesArray(tempArray);
  }, [getValues, tempArray, debounced, completedToken]);

  const [showUserList, setShowUserList] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState('');

  const newMessageRef = useRef<TextInputType>(null);

  const { mentionMembers } = useMention(
    mentionKeyword,
    showUserList,
    setMentionLoading,
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

  const { debounceSaveDraft } = useAutoSavePostDraft({
    createPostDraft,
    getValues,
    type: PostDraftType.NewPrivateMessage,
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

  useEffect(() => {
    setModal(true);
  }, [setModal]);

  useEffect(() => {
    setUri(imageUri);
  }, [imageUri]);

  useEffect(() => {
    if (!uri || !user) {
      return;
    }
    setImagesArray([...imagesArray, { link: '', done: false }]);
    setCurrentUploadToken(currentUploadToken + 1);
    const reactNativeFile = createReactNativeFile(uri);

    if (!reactNativeFile) {
      return;
    }

    const { raw } = getValues();
    const result = insertImageUploadStatus(
      raw,
      cursorPosition.start,
      imagesArray.length + 1,
    );
    setValue('raw', result);
    upload({
      variables: {
        input: {
          file: reactNativeFile,
          userId: user.id || 0,
          type: UploadTypeEnum.Composer,
          token: currentUploadToken,
        },
      },
    });
    setUri('');
  }, [
    currentUploadToken,
    cursorPosition.start,
    imagesArray,
    getValues,
    setValue,
    upload,
    uploadsInProgress,
    uri,
    user,
  ]);

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
    prevScreen: 'NewMessage',
    extensions: normalizedExtensions,
  });

  useEffect(() => {
    setSelectedUsers(users || []);
  }, [users]);

  const { length } = selectedUsers;

  if (hyperlinkUrl) {
    const { newUrl, newTitle } = getHyperlink(hyperlinkUrl, hyperlinkTitle);
    hyperlinkUrl = newUrl;
    hyperlinkTitle = newTitle;
  }

  useEffect(() => {
    const messageObject = getValues();
    const result = insertHyperlink(
      messageObject.raw,
      hyperlinkTitle,
      hyperlinkUrl,
    );
    setValue('raw', result);
  }, [hyperlinkTitle, hyperlinkUrl, getValues, setValue]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (
          uploadsInProgress < 1 &&
          ((!dirtyFields.title && !dirtyFields.raw && !dirtyFields.polls) ||
            !modal)
        ) {
          resetForm(FORM_DEFAULT_VALUES);
          return;
        }
        e.preventDefault();
        saveAndDiscardPostDraftAlert({
          deletePostDraft,
          createPostDraft,
          event: e,
          navigation,
          getValues,
          resetForm,
          draftType: PostDraftType.NewPrivateMessage,
          debounceSaveDraft,
        });
      }),
    [
      navigation,
      modal,
      uploadsInProgress,
      resetForm,
      deletePostDraft,
      createPostDraft,
      getValues,
      dirtyFields.title,
      dirtyFields.raw,
      dirtyFields.polls,
      debounceSaveDraft,
    ],
  );

  const { upload: uploadStateless } = useStatelessUpload();

  const onSendMessage = handleSubmit(async (data) => {
    Keyboard.dismiss();

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
      // Use renamed hook
      const result = await uploadStateless({
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

      const finalContent = `${getValues('raw')}\n${markdownLinks}`;
      setValue('raw', finalContent);
      setLocalImages([]);

      newMessage({
        variables: {
          newPrivateMessageInput: {
            ...data,
            raw: finalContent,
            targetRecipients: data.messageTargetSelectedUsers || [],
          },
        },
      });
    } catch (error) {
      errorHandlerAlert(error as Error);
      setLocalImages((prev) =>
        prev.map((image) => ({ ...image, isUploading: false })),
      );
    }
  });

  const onPressSelectUser = () => {
    navigate('SelectUser');
  };

  const setMentionValue = (text: string) => {
    setValue('raw', text);
  };

  const Header = () =>
    ios ? (
      <ModalHeader
        title={t('New Message')}
        left={
          <HeaderItem
            label={t('Cancel')}
            onPressItem={goBack}
            left
            disabled={newMessageLoading || loadingCreateAndUpdatePostDraft}
          />
        }
        right={
          <HeaderItem
            label={t('Send')}
            onPressItem={onSendMessage}
            disabled={
              !isValid ||
              selectedUsers.length === 0 ||
              newMessageLoading ||
              loadingCreateAndUpdatePostDraft
            }
          />
        }
      />
    ) : (
      <CustomHeader
        title={t('New Message')}
        rightTitle={t('Send')}
        onPressRight={onSendMessage}
        disabled={!isValid || selectedUsers.length === 0}
        noShadow
        isLoading={newMessageLoading || loadingCreateAndUpdatePostDraft}
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      {newMessageLoading ? (
        <LoadingOrError loading />
      ) : (
        <KeyboardTextAreaScrollView
          {...kasv.props}
          bottomMenu={
            <View>
              <MentionList
                showUserList={showUserList}
                members={mentionMembers}
                mentionLoading={mentionLoading}
                rawText={getValues('raw')}
                textRef={newMessageRef}
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
            <View style={styles.formContainer}>
              <Text style={styles.label}>{t('Subject')}</Text>
              <Controller
                name="title"
                defaultValue=""
                rules={{ required: true }}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.textInput,
                      { marginLeft: spacing.m, textAlign: 'right' },
                    ]}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      debounceSaveDraft();
                    }}
                    onFocus={() => setShowLeftMenu(false)}
                    placeholder={t('What do you want to talk about?')}
                    placeholderTextColor={colors.darkTextLighter}
                    testID="NewMessage:TextInput:Title"
                    autoCorrect
                  />
                )}
              />
            </View>

            <Divider horizontalSpacing="xxl" />

            <View style={styles.formContainer}>
              <Text style={styles.label}>{t('Recipients')}</Text>
              <TouchableOpacity
                style={styles.row}
                onPress={onPressSelectUser}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                testID="NewMessage:Button:SelectUser"
              >
                <Text
                  style={{
                    color: length ? colors.textNormal : colors.darkTextLighter,
                    paddingRight: spacing.m,
                  }}
                >
                  {length > 0
                    ? t('{users} {length}', {
                      users: selectedUsers[0],
                      length:
                        length - 1 > 0
                          ? '+' +
                          (length - 1) +
                          (length - 1 === 1 ? ' other' : ' others')
                          : '',
                    })
                    : t('Add a recipient')}
                </Text>
                <Icon name="ChevronRight" color={colors.textLighter} />
              </TouchableOpacity>
            </View>

            <Divider horizontalSpacing="xxl" />

            <View style={styles.localImagesContainer}>
              {localImages.map((image, index) => (
                <View key={index} style={styles.localImageWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.localImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      setLocalImages((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Icon name="Close" size="s" color="white" />
                  </TouchableOpacity>
                  {image.isUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="white" />
                    </View>
                  )}
                </View>
              ))}
            </View>
            <ListCreatePoll
              polls={polls || []}
              setValue={setValue}
              navigate={navigate}
              prevScreen="NewMessage"
            />

            <Controller
              name="raw"
              defaultValue=""
              rules={{ required: true }}
              control={control}
              render={({ field: { onChange, value } }) => (
                <TextArea
                  isKeyboardShow={isKeyboardShow}
                  value={value}
                  inputRef={newMessageRef}
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
                    debounced({ value: text, token: currentUploadToken });
                    debounceSaveDraft();
                  }}
                  style={styles.spacingHorizontal}
                  onFocus={(event) => {
                    kasv.scrollToFocusedInput(event);
                    setKeyboardShow(true);
                    setShowLeftMenu(true);
                  }}
                  onBlur={() => {
                    setKeyboardShow(false);
                  }}
                  onSelectedChange={(cursor) => {
                    setCursorPosition(cursor);
                  }}
                  placeholder={t('Type a message')}
                  mentionToggled={showUserList}
                  testID="NewMessage:TextArea"
                />
              )}
            />
          </>
        </KeyboardTextAreaScrollView>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, fontSizes, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textLight,
    fontSize: fontSizes.m,
  },
  textInput: {
    flex: 1,
    color: colors.textNormal,
    fontSize: fontSizes.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacingHorizontal: {
    marginHorizontal: spacing.xxl,
  },
  localImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.xxl,
  },
  localImageWrapper: {
    position: 'relative',
    margin: spacing.s,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  localImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
}));