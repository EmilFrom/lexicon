# Refactoring Guide: Implementing the New Markdown Renderer

This document provides a file-by-file guide for refactoring the codebase to use the new, unified `MarkdownRenderer.tsx` and the "Image Stripping Pattern".

### The Core Pattern Explained

The "Image Stripping Pattern" is the key to solving our rendering issues. It involves three simple steps before rendering any HTML content from the API:

1.  `const imageTagRegex = /<img[^>]*>/g;`
    *   **What it is:** A regular expression that finds all HTML image tags (e.g., `<img src="...">`).
    *   **Why:** To locate all images within the raw HTML content.

2.  `const images = getCompleteImageVideoUrls(content) || [];`
    *   **What it is:** A call to a helper function that parses the HTML (`content`) and extracts the `src` URLs of all images into a simple array of strings.
    *   **Why:** We need a clean list of image URLs to pass to our dedicated `<ImageCarousel />` component.

3.  `const contentWithoutImages = content ? content.replace(imageTagRegex, '') : '';`
    *   **What it is:** A function that takes the original HTML and removes all the `<img>` tags found by the regex.
    *   **Why:** This creates a "clean" version of the HTML containing only text and other elements. This is what we pass to `<MarkdownRenderer />` to prevent it from trying to render images, which avoids the `key` prop bug and other layout issues.

---

## File-by-File Refactoring Instructions

### 1. `@src/components/RepliedPost.tsx`

*   **Component to Refactor:** `BaseRepliedPost`
*   **Current Issue:** Uses the old, deprecated `<Markdown>` component.
*   **Plan:** Replace `<Markdown>` with the new `<MarkdownRenderer>` and apply the image stripping pattern for consistency.

**Before:**
```tsx
import { Markdown } from './Markdown'; // Deprecated

function BaseRepliedPost(props: BaseRepliedPostProps) {
  // ...
  return (
    // ...
      <View style={styles.nestedCommentContainer}>
        {!hideAuthor && <Author image={getImage(avatar)} title={username} />}
        <Markdown
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(markdownContent ?? undefined)}
          mentions={mentions ?? undefined}
        />
      </View>
    // ...
  );
}
```

**After:**
```tsx
import { MarkdownRenderer } from './MarkdownRenderer'; // New
// Note: ImageCarousel is likely not needed for replies, but stripping is good practice.

function BaseRepliedPost(props: BaseRepliedPostProps) {
  const { avatar, username, markdownContent, mentions, hideAuthor } = props;
  const styles = useStyles();

  // 1. Apply the image stripping pattern
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';

  return (
    <View style={styles.nestedRowContainer}>
      <Divider vertical />
      <View style={styles.nestedCommentContainer}>
        {!hideAuthor && <Author image={getImage(avatar)} title={username} />}
        {/* 2. Use the new component with the clean content */}
        <MarkdownRenderer
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(contentWithoutImages ?? '')}
        />
      </View>
    </View>
  );
}
```

---

### 2. `@src/core-ui/ChatBubble.tsx`

*   **Component to Refactor:** `ChatBubble`
*   **Current Issue:** It already uses `MarkdownRenderer`, but it passes props (`mentionColor`, `mentions`) that are no longer needed because the new renderer handles this logic internally.
*   **Plan:** Clean up the props being passed to `MarkdownRenderer`. The image stripping pattern should be applied in the parent component (`ChatMessageItem.tsx`) before the `message` prop is passed here.

**Before:**
```tsx
const ChatBubble = memo((props: Props) => {
  // ...
  const {
    message,
    // ...
    mentions,
    nonClickable,
    // ...
  } = props;

  return (
    // ...
      <MarkdownRenderer
        fontColor={automaticFontColor(colors[bgColor])}
        mentionColor={bgColor} // Deprecated
        content={message}
        mentions={mentions} // Deprecated
        nonClickable={nonClickable}
      />
    // ...
  );
});
```

**After:**
```tsx
const ChatBubble = memo((props: Props) => {
  // ...
  const {
    message,
    // ...
    nonClickable,
    // ...
  } = props;

  return (
    // ...
      <MarkdownRenderer
        fontColor={automaticFontColor(colors[bgColor])}
        content={message} // Assumes message has images stripped by parent
        nonClickable={nonClickable}
      />
    // ...
  );
});
```

---

### 3. `@src/screens/Chat/components/ChatMessageItem.tsx`

*   **Component to Refactor:** `ChatMessageItem`
*   **Current Issue:** Uses the deprecated `<Markdown>` component.
*   **Plan:** This is the parent of `ChatBubble`. Here, we will apply the image stripping pattern to the chat message content and pass the clean content down.

**Before:**
```tsx
import { Markdown } from '../../../components'; // Deprecated

export function ChatMessageItem(props: Props) {
  // ...
  const markdownContentScene = handleUnsupportedMarkdown(filteredMessage);
  // ...
  const renderFirstChatBubble = () => {
    return (
      // ...
          <Markdown
            fontColor={automaticFontColor(colors.backgroundDarker)}
            mentionColor="backgroundDarker"
            content={markdownContentScene}
          />
      // ...
    );
  };

  const renderChatBubble = () => {
    // ...
    return (
      // ...
        <Markdown
          fontColor={automaticFontColor(colors.backgroundDarker)}
          mentionColor="backgroundDarker"
          content={markdownContentScene}
        />
      // ...
    );
  };
  // ...
}
```

**After:**
```tsx
import { MarkdownRenderer } from '../../../components/MarkdownRenderer'; // New
import { ImageCarousel } from '../../../components/ImageCarousel'; // New
import { getCompleteImageVideoUrls } from '../../../helpers/api/processRawContent'; // Helper

export function ChatMessageItem(props: Props) {
  // ...
  const { markdownContent } = content;

  // 1. Apply the image stripping pattern
  const imageTagRegex = /<img[^>]*>/g;
  const images = getCompleteImageVideoUrls(markdownContent) || [];
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';
  const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

  // ...
  const renderFirstChatBubble = () => {
    return (
      // ...
          {/* 2. Use the new component and render images separately */}
          <MarkdownRenderer
            fontColor={automaticFontColor(colors.backgroundDarker)}
            content={markdownContentScene}
          />
          <ImageCarousel images={images} onImagePress={/* ... */} />
      // ...
    );
  };

  const renderChatBubble = () => {
    // ...
    return (
      // ...
        <MarkdownRenderer
          fontColor={automaticFontColor(colors.backgroundDarker)}
          content={markdownContentScene}
        />
        <ImageCarousel images={images} onImagePress={/* ... */} />
      // ...
    );
  };
  // ...
}
```

---

### 4. `@src/navigation/ProfileDrawerNavigator.tsx`

*   **Component to Refactor:** `DrawerContent`
*   **Current Issue:** Uses the deprecated `<Markdown>` component to render a user's bio.
*   **Plan:** Replace it with `<MarkdownRenderer>`. User bios rarely contain images, so stripping is a formality but good for consistency.

**Before:**
```tsx
import { Markdown, UserStatus } from '../components'; // Deprecated

function DrawerContent({ state }: DrawerContentComponentProps) {
  // ...
  return (
    // ...
        <Markdown
          content={
            (splittedBio && splittedBio.length > 3
              ? `${splittedBio.slice(0, 3).join('\n')}...`
              : user.bioRaw) || ''
          }
          style={styles.bioContainer}
        />
    // ...
  );
}
```

**After:**
```tsx
import { MarkdownRenderer, UserStatus } from '../components'; // New

function DrawerContent({ state }: DrawerContentComponentProps) {
  // ...
  const bioContent = (splittedBio && splittedBio.length > 3
      ? `${splittedBio.slice(0, 3).join('\n')}...`
      : user.bioRaw) || '';

  return (
    // ...
        <MarkdownRenderer
          content={bioContent}
          style={styles.bioContainer}
        />
    // ...
  );
}
```

---

### 5. `@src/screens/Profile/Profile.tsx`

*   **Component to Refactor:** `Profile`
*   **Current Issue:** Already uses `MarkdownRenderer`, which is great. No major change is needed, just a confirmation of the correct usage.
*   **Plan:** Ensure the call is clean and correct. Like the drawer, bios are simple, so image stripping isn't critical but can be done for consistency.

**Before & After (Code is already correct):**
```tsx
import { MarkdownRenderer } from '../../components/MarkdownRenderer';

export default function Profile() {
  // ...
  const bioContent = (splittedBio && splittedBio.length > 3
      ? `${splittedBio.slice(0, 3).join('\n')}...`
      : profileUser.bioRaw) || '';
  // ...
  return (
    // ...
              <MarkdownRenderer
                content={bioContent}
                style={styles.bioContainer}
              />
    // ...
  );
}
```

---

### 6. `@src/screens/PostPreview.tsx`

*   **Component to Refactor:** `PostPreview`
*   **Current Issue:** Contains a bug where it calls `MarkdownRenderer` as a function instead of using it as a component.
*   **Plan:** Fix the incorrect call and properly apply the image stripping pattern. The preview should show the text content, and the extracted images should be rendered separately below it.

**Before (Buggy):**
```tsx
export default function PostPreview() {
  // ...
  return (
    // ...
        <MarkdownRenderer
          content={MarkdownRenderer(content, imageUrls)} // BUG!
          style={styles.markdown}
          nonClickable={true}
        />
        {!reply &&
          images?.map((image, index) => (
            <AuthenticatedImage
              url={image}
              // ...
            />
          ))}
    // ...
  );
}
```

**After (Corrected):**
```tsx
export default function PostPreview() {
  const { /*...,*/ raw: content, /*...*/ } = getValues();
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // 1. Apply the image stripping pattern
  const imageTagRegex = /<img[^>]*>/g;
  const imagesFromContent = getCompleteImageVideoUrls(content) || [];
  const contentWithoutImages = content ? content.replace(imageTagRegex, '') : '';

  return (
    // ...
        {/* 2. Use the component correctly with clean content */}
        <MarkdownRenderer
          content={contentWithoutImages}
          style={styles.markdown}
          nonClickable={true}
        />
        {/* 3. Render extracted images in a carousel */}
        <ImageCarousel
          images={imagesFromContent}
          onImagePress={(uri) => setFullScreenImage(uri)}
        />
        <FullScreenImageModal
          visible={!!fullScreenImage}
          imageUri={fullScreenImage || ''}
          onClose={() => setFullScreenImage(null)}
        />
    // ...
  );
}
```

---
---

## Addendum: Correcting the `ChatMessageItem.tsx` Implementation

You correctly pointed out that the previous "After" example for `ChatMessageItem.tsx` was flawed. It had a syntax error and didn't properly handle the full-screen image viewing.

Here is a complete, corrected, and robust implementation for the entire `ChatMessageItem.tsx` component. This follows the pattern used in other components like `PostItem` for a consistent user experience.

### Corrected and Complete `ChatMessageItem.tsx`

```tsx
import React, { Fragment, useState } from 'react'; // Import useState
import { StyleProp, View, ViewStyle } from 'react-native';

// Import all necessary components and helpers
import { MarkdownRenderer } from '../../../components/MarkdownRenderer';
import { ImageCarousel } from '../../../components/ImageCarousel';
import { FullScreenImageModal } from '../../../components/FullScreenImageModal'; // Import the modal
import { MetricItem } from '../../../components/Metrics/MetricItem';
import { Avatar, Icon, Text } from '../../../core-ui';
import {
  automaticFontColor,
  filterMarkdownContentPoll,
  formatDateTime,
  formatTime,
  getImage,
  getCompleteImageVideoUrls, // Ensure this is imported
  handleUnsupportedMarkdown,
} from '../../../helpers';
import { makeStyles, useTheme } from '../../../theme';
import {
  ChatMessageContent,
  ThreadDetailFirstContent,
  User,
} from '../../../types';

// Props definition remains the same...
type Props = { /* ... */ };

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

  // 1. Add state for the full-screen image modal
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const { id, time, markdownContent } = content;

  // 2. Correctly process the markdown content
  const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');
  const images = getCompleteImageVideoUrls(filteredMarkdown) || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = filteredMarkdown.replace(imageTagRegex, '');
  const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

  const unsupported = 'uploads' in content ? content.uploads.length > 0 : false;

  const renderUnsupported = () => { /* ... unchanged ... */ };

  // This function now renders the text and the image carousel separately
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
          <Text color="textLight" size="xs" style={styles.name">
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
        {/* ... timestamp and other elements ... */}
        <View style={styles.messageItem}>
          {settings ? renderFirstChatBubble() : renderChatBubble()}
          {/* ... replies metric ... */}
        </View>
        {/* ... unread messages indicator ... */}
      </Fragment>

      {/* 3. Add the modal to the component's render output */}
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </View>
  );
}

// useStyles remains the same...
```

---
---

## Addendum 2: Clarification for `Profile.tsx`

You correctly identified that the code snippet for `Profile.tsx` in the guide was a simplified version of the actual code. My apologies for that confusion.

**The key point is that `Profile.tsx` requires no changes.**

It is already using the correct `<MarkdownRenderer />` component. The logic it uses to truncate the bio before passing it to the component is also correct.

Here is the actual, correct code from the file, which can be left as-is:

```tsx
// ... inside the Profile component's return statement

              <MarkdownRenderer
                content={
                  (splittedBio && splittedBio.length > 3
                    ? `${splittedBio.slice(0, 3).join('\n')}...`
                    : profileUser.bioRaw) || ''
                }
                style={styles.bioContainer}
              />

// ...
```

Because this file already uses the right component and doesn't need to handle images, it does not need to be refactored.
