# Comprehensive Plan to Resolve TypeScript Errors

## Introduction

This document provides a detailed, step-by-step guide to fix all the TypeScript errors reported by VSCode. The errors stem primarily from an incorrect implementation of the `Collapsible.tsx` component and incomplete refactoring steps across several other files.

We will proceed in a logical order, starting with the foundational component that is causing the most issues.

---

## Step 1: The Foundation - Completely Fix `Collapsible.tsx`

**Problem:** The file `src/components/Collapsible.tsx` is the source of over 20 errors. It appears that the correct code for a simple `Collapsible` component was combined with a large amount of unrelated code from `MarkdownRenderer.tsx`. This has led to duplicate identifiers, scope conflicts, and incorrect type definitions.

**Solution:** The entire content of this file must be replaced with the clean, correct, and minimal code for a standalone `Collapsible` component. This single action will resolve all errors within this file and fix the downstream import error in `MarkdownRenderer.tsx`.

**Action:** Replace the **entire contents** of `src/components/Collapsible.tsx` with the following code:

```tsx
import React, { useState, PropsWithChildren } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon, Text } from '../core-ui';
import { makeStyles, useTheme } from '../theme';

type Props = {
  title: string;
};

export function Collapsible({ title, children }: PropsWithChildren<Props>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
        <View style={styles.titleContainer}>
          <Text variant="bold" style={styles.flex}>
            {title}
          </Text>
          <Icon
            name={isOpen ? 'ChevronUp' : 'ChevronDown'}
            color={colors.textLighter}
          />
        </View>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.contentContainer}>
          {children}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  flex: { flex: 1 },
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.m,
    overflow: 'hidden',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.l,
    backgroundColor: colors.backgroundDarker,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
}));
```

---

## Step 2: Fix `MarkdownRenderer.tsx` Import

**Problem:** This file has one error: `Cannot find module './Collapsible'`.
**Solution:** This error was caused by the broken state of `Collapsible.tsx`. Once Step 1 is complete, `Collapsible.tsx` will correctly export the `Collapsible` component, and this import error will automatically be resolved. No code changes are needed in this file, just ensure the import is present.

**Action:** Verify that `src/components/MarkdownRenderer.tsx` contains the following import statement.

```tsx
import { Collapsible } from './Collapsible';
```

---

## Step 3: Fix `PostItem/PostItem.tsx` Prop Usage

**Problem:** This file is trying to pass a `mentions` prop to `<MarkdownRenderer>`, but our new, cleaner component no longer accepts it (as it handles mentions internally).
**Solution:** Remove the `mentions` prop from the component call.

**Action:** In `src/components/PostItem/PostItem.tsx`, find the `<MarkdownRenderer>` component and modify it as follows:

**Before:**
```tsx
<MarkdownRenderer
  content={replaceTagsInContent(unescapeHTML(contentWithoutImages))}
  style={styles.markdown}
  fontColor={colors[color]}
  mentions={mentionedUsers} // <-- REMOVE THIS LINE
/>
```

**After:**
```tsx
<MarkdownRenderer
  content={replaceTagsInContent(unescapeHTML(contentWithoutImages))}
  style={styles.markdown}
  fontColor={colors[color]}
/>
```

---

## Step 4: Fix Variable Declarations

**Problem:** Several files are attempting to use variables like `contentWithoutImages` and `bioContent` without declaring them first.
**Solution:** Add the necessary constant declarations based on our refactoring plan.

**Action 1: In `src/components/RepliedPost.tsx`**
*   **Before:** The call to `<MarkdownRenderer>` uses an undefined variable.
*   **After:** Add the `const` that declares the variable.

```tsx
// Inside the BaseRepliedPost function

// ADD THESE LINES
const imageTagRegex = /<img[^>]*>/g;
const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';

// ... later in the return statement
<MarkdownRenderer
  style={styles.nestedContent}
  content={handleUnsupportedMarkdown(contentWithoutImages ?? '')}
/>
```

**Action 2: In `src/navigation/ProfileDrawerNavigator.tsx`**
*   **Before:** The `content` prop is being passed an undefined variable.
*   **After:** Define `bioContent` before the `return` statement.

```tsx
// Inside the DrawerContent function

// ADD THIS LINE
const bioContent = (splittedBio && splittedBio.length > 3
    ? `${splittedBio.slice(0, 3).join('\n')}...`
    : user.bioRaw) || '';

// ... in the return statement
<Markdown
  content={bioContent}
  style={styles.bioContainer}
/>
```

---

## Step 5: Fix `PostPreview.tsx` Scoping and Import Issues

**Problem:** This file has several issues: variables are being redeclared, hooks are being used before declaration, and an import is missing.
**Solution:** Clean up the duplicate declarations, reorder the code to respect hook rules, and add the missing import.

**Action:** Replace the top section of the `PostPreview` function with the corrected version.

**Before (multiple errors):**
```tsx
export default function PostPreview() {
  // ...
  const { reset: resetForm, getValues, watch } = useFormContext();

  const [imageUrls, setImageUrls] = useState<Array<string>>();

  const { title, raw: content, tags, channelId, isDraft } = getValues(); // <-- Used before declaration
  // ...
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null); // <-- Redeclared
  // ...
  const imagesFromContent = getCompleteImageVideoUrls(content) || []; // <-- Missing import
  // ...
}
```

**After (Corrected):**
```tsx
// Add this import at the top of the file
import { getCompleteImageVideoUrls } from '../helpers';

export default function PostPreview() {
  const { setModal } = useModal();
  const styles = useStyles();
  const { colors } = useTheme();

  const navigation = useNavigation<RootStackNavProp<'PostPreview'>>();
  const { goBack } = navigation;
  
  // State declaration is now at the top
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Array<string>>();

  const {
    params: { reply, postData, editPostId, editTopicId, editedUser },
  } = useRoute<RootStackRouteProp<'PostPreview'>>();

  const storage = useStorage();
  const channels = storage.getItem('channels');

  // Hooks are called before they are used
  const { reset: resetForm, getValues, watch } = useFormContext();

  // Variables are now declared after the hook that provides them
  const { title, raw: content, tags, channelId, isDraft } = getValues();
  const draftKey: string | undefined = watch('draftKey');
  const shortUrls = getPostShortUrl(content) ?? [];
  const images = postData.images;

  // ... rest of the component logic
}
```

---

## Step 6: Fully Implement and Correct `ChatMessageItem.tsx`

**Problem:** This file has the most complex set of errors, including duplicate variables, syntax errors, and an incomplete implementation of the image carousel and modal.
**Solution:** Replace the component's implementation with the complete, corrected version from our plan, which properly manages state, fixes syntax, and correctly structures the JSX.

**Action:** Replace the **entire `ChatMessageItem` function and its surrounding code** (but keep the `Props` type and `useStyles` hook) in `src/screens/Chat/components/ChatMessageItem.tsx` with the following:

```tsx
import React, { Fragment, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { MarkdownRenderer } from '../../../components/MarkdownRenderer';
import { ImageCarousel } from '../../../components/ImageCarousel';
import { FullScreenImageModal } from '../../../components/FullScreenImageModal';
import { MetricItem } from '../../../components/Metrics/MetricItem';
import { Avatar, Icon, Text } from '../../../core-ui';
import {
  automaticFontColor,
  filterMarkdownContentPoll,
  formatDateTime,
  formatTime,
  getImage,
  getCompleteImageVideoUrls,
  handleUnsupportedMarkdown,
} from '../../../helpers';
import { makeStyles, useTheme } from '../../../theme';
import {
  ChatMessageContent,
  ThreadDetailFirstContent,
  User,
} from '../../../types';

// The Props type definition should remain here...

export function ChatMessageItem(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    content,
    sender,
    newTimestamp,
    onPressAvatar,
    unread,
    settings,
    firstChatBubbleStyle,
    onPressReplies,
    hideReplies,
    testID,
    isLoading,
  } = props;

  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const { id, time, markdownContent } = content;

  const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');
  const images = getCompleteImageVideoUrls(filteredMarkdown)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = filteredMarkdown.replace(imageTagRegex, '');
  const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

  const unsupported = 'uploads' in content ? content.uploads.length > 0 : false;

  const renderUnsupported = () => {
    return (
      <View style={styles.unsupported}>
        <Icon
          name="Information"
          size="xl"
          color={colors.textLighter}
          style={styles.unsupportedIcon}
        />
        <Text size="xs" color="textLight" style={styles.unsupportedText}>
          {t('Unsupported file type.')}
        </Text>
        <Text size="xs" color="textLight" style={styles.unsupportedText}>
          {t('To open, please visit Discourse web.')}
        </Text>
      </View>
    );
  };

  const renderMessageContent = () => (
    <>
      <MarkdownRenderer
        fontColor={automaticFontColor(colors.backgroundDarker)}
        content={markdownContentScene}
      />
      {images.length > 0 && (
        <ImageCarousel
          images={images}
          onImagePress={(uri) => setFullScreenImage(uri)}
        />
      )}
      {unsupported && renderUnsupported()}
    </>
  );

  const renderFirstChatBubble = () => {
    return (
      <View style={[styles.firstItem, firstChatBubbleStyle]}>
        <Avatar
          src={getImage(sender.avatar)}
          style={styles.avatar}
          onPress={onPressAvatar}
          size="xs"
        />
        <View style={styles.flex}>
          <Text color="textLight" size="xs" style={styles.name}>
            {t('{sender} • {time}', {
              sender: sender?.username,
              time: formatTime({ dateString: time, hour12: true }),
            })}
          </Text>
          {renderMessageContent()}
        </View>
      </View>
    );
  };

  const renderChatBubble = () => {
    if (!markdownContentScene && images.length === 0) {
      return null;
    }
    return (
      <View style={styles.nextItem}>
        {renderMessageContent()}
      </View>
    );
  };

  return (
    <View style={styles.flex} testID={testID}>
      <Fragment key={id}>
        {newTimestamp && (
          <Text
            color="textLight"
            size="xs"
            style={[styles.timestamp, styles.time]}
          >
            {formatDateTime(time, 'medium')}
          </Text>
        )}

        <View style={styles.messageItem}>
          {settings ? renderFirstChatBubble() : renderChatBubble()}
          {!hideReplies &&
          'replyCount' in content &&
          content.replyCount != null &&
          content.replyCount !== undefined ? (
            <View style={[styles.nextItem, styles.threadButton]}>
              <MetricItem
                type="Thread"
                count={content.replyCount}
                fontStyle={styles.metric}
                onPress={onPressReplies}
                testID={`Chat:ChatItem:MetricItem:IconWithLabel:${id}`}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </View>
          ) : null}
        </View>

        {unread && (
          <View style={styles.unread}>
            <Text color="textLight" size="xs" style={styles.time}>
              {t('Unread Messages')}
            </Text>
          </View>
        )}
      </Fragment>

      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </View>
  );
}

// The useStyles hook should remain here...
```

---

## Final Verification

After completing these steps, all the reported TypeScript errors should be resolved. You can confirm this by running `yarn typecheck` in your terminal or by observing that the "Problems" tab in VSCode is clear.
