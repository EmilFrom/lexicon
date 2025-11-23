import React, {
  Dispatch,
  forwardRef,
  RefObject,
  SetStateAction,
  useState,
  useMemo,
} from 'react';
import { View, VirtualizedList, TouchableOpacity } from 'react-native';
import { KeyboardAccessoryView } from 'react-native-keyboard-accessory';
import * as ImageManipulator from 'expo-image-manipulator';

import { MentionList } from '../../../components';
import { TextInputType, Icon, ActivityIndicator } from '../../../core-ui';
import {
  mentionHelper,
  useStorage,
  imagePickerHandler,
  createReactNativeFile,
  formatExtensions,
  resolveUploadUrl,
} from '../../../helpers';
import { useMention, useStatelessUpload, useSiteSettings } from '../../../hooks';
import { makeStyles, useTheme } from '../../../theme';
import { CursorPosition } from '../../../types';
import { useDevice } from '../../../utils';
import { ReplyInputField, ListImageSelected } from '../../MessageDetail/components';
import { UploadTypeEnum } from '../../../generatedAPI/server';

type Props<T> = {
  listRef: React.RefObject<VirtualizedList<T> | null>; // A reference to the chat list component.
  setInputFocused: React.Dispatch<React.SetStateAction<boolean>>; // Function to update the state of text input focus.
  onReply: (message: string) => void; // Callback function invoked when the reply button is clicked.
  replyLoading?: boolean; // loading when try hit hook reply chat
  message: string; // state text input message
  setMessage: Dispatch<SetStateAction<string>>; // set state value text input message
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
};

function BaseFooterReplyChat<T>(
  props: Props<T>,
  ref: RefObject<TextInputType>,
) {
  const {
    setInputFocused,
    onReply,
    replyLoading,
    message,
    setMessage,
    ...other
  } = props;
  const styles = useStyles();
  const { colors } = useTheme();

  const { isTablet } = useDevice();

  const [showUserList, setShowUserList] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const [mentionKeyword, setMentionKeyword] = useState('');

  // Local map to store "upload://..." -> "https://..." mapping for immediate preview
  // This avoids the "No suitable image URL loader" error for just-uploaded images
  const [localImageMap, setLocalImageMap] = useState<Record<string, string>>({});

  const { mentionMembers } = useMention(
    mentionKeyword,
    showUserList,
    setMentionLoading,
  );

  // --- Upload Logic ---
  const storage = useStorage();
  const user = storage.getItem('user');
  const { authorizedExtensions } = useSiteSettings();
  const normalizedExtensions = formatExtensions(authorizedExtensions?.split('|'));

  const { upload, loading: uploadLoading } = useStatelessUpload({
    onCompleted: ({ upload: result }) => {
      // Discourse Chat usually expects the markdown: ![filename|widthxheight](shortUrl)
      const markdown = `![${result.originalFilename}|${result.width}x${result.height}](${result.shortUrl})`;
      
      // Cache the mapping so the preview renders immediately
      if (result.shortUrl && result.url) {
        setLocalImageMap(prev => ({ ...prev, [result.shortUrl]: result.url }));
      }

      // Append to current message text
      setMessage((prev) => prev + (prev ? '\n' : '') + markdown);
    }
  });

  const onPickImage = async () => {
    const result = await imagePickerHandler(normalizedExtensions);
    if (result && result.uri && user) {
       // 1. Compress and Convert to JPEG
       // This reduces file size and ensures format compatibility
       const manipulatedImage = await ImageManipulator.manipulateAsync(
         result.uri,
         [], // no actions like resize/crop, just convert
         { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
       );

       const file = createReactNativeFile(manipulatedImage.uri);
       if (file) {
         upload({
           variables: {
             input: {
               file,
               userId: user.id,
               type: UploadTypeEnum.Composer, 
             }
           }
         });
       }
    }
  };

  // --- Image Preview Logic ---
  // Parse the markdown in the input box to find upload:// links
  const attachedImages = useMemo(() => {
    if (!message) return [];
    // Regex to find: ![filename|size](upload://...)
    // Captures: full match, and just the url part
    const regex = /!\[.*?\]\((upload:\/\/[^)]+)\)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(message)) !== null) {
      matches.push({
        fullMarkdown: match[0],
        url: match[1]
      });
    }
    return matches;
  }, [message]);

  const onDeleteImage = (index: number) => {
    const imageToRemove = attachedImages[index];
    if (imageToRemove) {
      // Remove the specific markdown string from the message
      setMessage((prev) => prev.replace(imageToRemove.fullMarkdown, '').trim());
    }
  };

  return (
    <KeyboardAccessoryView
      androidAdjustResize
      inSafeAreaView
      hideBorder
      alwaysVisible
      style={styles.keyboardAcc}
    >
      <MentionList
        showUserList={showUserList}
        members={mentionMembers}
        mentionLoading={mentionLoading}
        rawText={message}
        textRef={ref}
        setRawText={setMessage}
        setShowUserList={setShowUserList}
      />

      {/* Image Preview Area */}
      {attachedImages.length > 0 && (
        <View style={styles.previewContainer}>
          <ListImageSelected
            // Try local map first (fastest), then fallback to heuristic helper, then empty string
            imageUrls={attachedImages.map(img => localImageMap[img.url] || resolveUploadUrl(img.url) || '')}
            onDelete={onDeleteImage}
            isEdit={true}
            // Disable editing while uploading/replying
            disableEdit={uploadLoading || replyLoading}
          />
        </View>
      )}

      <View
        style={[
          styles.footerContainer,
          isTablet ? styles.tabletTextInput : false,
        ]}
      >
        <TouchableOpacity 
          onPress={onPickImage} 
          disabled={uploadLoading} 
          style={styles.uploadButton}
        >
          {uploadLoading ? (
             <ActivityIndicator size="small" color="textLighter" />
          ) : (
             <Icon name="Photo" color={colors.textLighter} />
          )}
        </TouchableOpacity>

        <ReplyInputField
          inputRef={ref}
          onPressSend={onReply}
          loading={replyLoading}
          style={styles.inputContainer}
          message={message}
          onSelectedChange={(cursor) => {
            setCursorPosition(cursor);
          }}
          onChangeValue={(message: string) => {
            mentionHelper(
              message,
              cursorPosition,
              setShowUserList,
              setMentionLoading,
              setMentionKeyword,
            );
            setMessage(message);
          }}
          onFocus={() => {
            setInputFocused(true);
          }}
          onBlur={() => {
            setInputFocused(false);
          }}
          {...other}
        />
      </View>
    </KeyboardAccessoryView>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  footerContainer: {
    backgroundColor: colors.background,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyboardAcc: {
    backgroundColor: colors.background,
  },
  previewContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flex: 1,
    paddingLeft: spacing.xl,
    paddingVertical: spacing.m,
    paddingRight: spacing.s,
    backgroundColor: colors.backgroundDarker,
  },
  tabletTextInput: { marginBottom: spacing.l },
  uploadButton: {
    marginRight: spacing.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
}));

const FooterReplyChat = forwardRef(BaseFooterReplyChat);
export { FooterReplyChat };