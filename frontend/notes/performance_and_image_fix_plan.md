# Plan to Fix Performance Warnings and Image Rendering

## 1. Analysis of the Issues

We are facing two distinct but related problems:

1.  **Performance Warning:** The console shows warnings like `You seem to update the renderers prop(s) of the "RenderHTML" component in short periods of time...`. This indicates that we are creating new functions or objects inside a component's render cycle, causing unnecessary and costly re-renders of the HTML view.
2.  **Image Rendering Bug:** The screenshots clearly show that instead of images, the raw Markdown/BBCode syntax (e.g., `![image](https://...)`) is being displayed as plain text.

### Root Cause Analysis

*   **Performance:** The warning is correct. In `MarkdownRenderer.tsx`, the `renderers` object is defined directly inside the component function. This means that every single time the `MarkdownRenderer` component re-renders, a brand new `renderers` object is created in memory. Even though the new object is identical in content, its reference is different, causing `RenderHTML` to think its props have changed and triggering a full, expensive re-render of the HTML tree.

*   **Image Bug:** This is a logical flaw in our current approach. `react-native-render-html` is, as its name implies, an **HTML renderer**. It does not understand Markdown syntax like `![image](...)`. The screenshots confirm that some parts of the app are feeding raw Markdown `content` to our components. Our "Image Stripping Pattern" was designed to find and remove HTML `<img>` tags, so when it receives Markdown, it finds nothing to strip, and the raw Markdown text is passed directly to `RenderHTML`, which then displays it as plain text.

## 2. The Two-Part Solution

We will address these issues with targeted fixes in `MarkdownRenderer.tsx` and the components that use it.

---

### Part 1: Fix the Performance Warning with Memoization

To solve the re-rendering issue, we must ensure the `renderers` object is not recreated on every render. We can achieve this using the `useMemo` hook from React, which will cache the object and only recreate it if its dependencies change.

**File to Modify:** `src/components/MarkdownRenderer.tsx`

**Action:**

1.  Wrap the `renderers` object definition in a `useMemo` hook.
2.  Provide a dependency array to `useMemo` that includes all props or other hook values that the renderers depend on. In this case, the `a` renderer depends on the `nonClickable` prop and the `navigate` and `push` functions from `useNavigation`.

**Corrected Code for `MarkdownRenderer.tsx`:**

```typescript
import React, { useMemo } from 'react'; // Import useMemo
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import RenderHTML, { MixedStyleDeclaration, RenderersProps } from 'react-native-render-html';

import { discourseHost } from '../constants';
import { Text } from '../core-ui/Text';
import { getValidDetailParams, extractPathname } from '../helpers';
import { makeStyles, useTheme } from '../theme';
import { StackNavProp } from '../types';
import { Collapsible } from './Collapsible';

// ... (Props type remains the same)

export function MarkdownRenderer({ content, fontColor, style, nonClickable }: Props) {
  const { navigate, push } = useNavigation<StackNavProp<'UserInformation'>>();
  const { colors, fontSizes } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useStyles();

  const tagsStyles: Readonly<Record<string, MixedStyleDeclaration>> = {
    // ... (this is fine as it's defined outside the component or can be memoized too)
  };

  // FIX: Wrap the renderers object in useMemo
  const renderers = useMemo(() => ({
    a: ({ TDefaultRenderer, ...props }: any) => {
      const { href } = props.tnode.attributes;
      const isMention = props.tnode.classes.includes('mention');

      if (isMention && !nonClickable) {
        const username = props.tnode.children[0].data.substring(1);
        return (
          <Text
            style={styles.mention}
            onPress={() => navigate('UserInformation', { username })}
          >
            {props.tnode.children[0].data}
          </Text>
        );
      }

      const handlePress = () => {
        if (nonClickable) return;
        const isSameHost = href.startsWith(discourseHost);
        const pathname = isSameHost ? extractPathname(href) : '';
        if (isSameHost && pathname) {
          const detailParams = getValidDetailParams(pathname.split('/'));
          if (detailParams) {
            push('PostDetail', { topicId: detailParams.topicId, postNumber: detailParams.postNumber });
            return;
          }
        }
        Linking.openURL(href);
      };

      return (
        <Text style={styles.link} onPress={handlePress}>
          <TDefaultRenderer {...props} />
        </Text>
      );
    },
    details: (props: RenderersProps) => {
      // ... (collapsible logic)
    },
    img: () => null,
  }), [nonClickable, navigate, push, styles.mention, styles.link]); // Dependency array

  return (
    <View style={style}>
      <RenderHTML
        contentWidth={width}
        source={{ html: content }}
        tagsStyles={tagsStyles}
        renderers={renderers}
      />
    </View>
  );
}

// ... (useStyles remains the same)
```

---

### Part 2: Fix the Image Rendering with a Markdown-to-HTML Step

To fix the image bug, we must ensure that we **always** process HTML. We will introduce a new step to our pattern: if the content is raw Markdown, we first convert it to HTML.

**Step 2.1: Create a Markdown Conversion Helper**

We will leverage the existing `markdown-it` dependency to create a simple, reusable converter.

**File to Create:** `src/helpers/markdownToHtml.ts`

```typescript
import MarkdownIt from 'markdown-it';

// Initialize the parser once for performance
const md = new MarkdownIt();

export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return md.render(markdown);
}
```

**Step 2.2: Update the "Content Processing Pattern"**

Our core pattern now gets a new first step. This needs to be applied in every component that renders user content.

**The New, Robust Pattern:**

```typescript
// In your component (e.g., PostItem.tsx, NestedComment.tsx)
import { markdownToHtml } from '../helpers/markdownToHtml'; // Import the new helper

// ...

// 1. Check if content is likely raw markdown (heuristic: starts with `![` or `[`).
//    A more robust check could be added if needed. Or simply convert all content.
//    For simplicity, we can assume the 'content' prop might be raw and convert it.
const htmlContent = markdownToHtml(content); // Convert raw content to HTML

// 2. Now proceed with the original image stripping pattern on the HTML
const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
const imageTagRegex = /<img[^>]*>/g;
const contentWithoutImages = htmlContent.replace(imageTagRegex, '');

// 3. Render the components
<MarkdownRenderer content={contentWithoutImages} />
<ImageCarousel images={images} />
```

**Step 2.3: Apply the New Pattern**

We need to update the components that are showing the bug.

**File to Modify:** `src/components/PostItem/PostItem.tsx`

```typescript
// ... (imports)
import { markdownToHtml } from '../../helpers/markdownToHtml';

function BasePostItem(props: Props) {
  // ...
  const { content, ... } = props;

  // Apply the new pattern
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');

  const mainContent = (
    // ...
        <View style={previewContainerStyle}>
          <MarkdownRenderer
            content={replaceTagsInContent(unescapeHTML(contentWithoutImages))}
            // ...
          />
        </View>
    // ...
  );

  const imageContent = (
    <ImageCarousel
      images={images} // Use the extracted images
      onImagePress={(uri) => setFullScreenImage(uri)}
      // ...
    />
  );
  // ...
}
```

**File to Modify:** `src/components/NestedComment.tsx`

```typescript
// ... (imports)
import { markdownToHtml } from '../helpers/markdownToHtml';

function BaseNestedComment(props: Props) {
  // ...
  const [content, setContent] = useState(contentFromGetTopicDetail);
  // ...

  // Apply the new pattern inside the component
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');

  return (
    // ...
        <MarkdownRenderer
          content={
            replyToPostId
              ? handleUnsupportedMarkdown(
                  deleteQuoteBbCode(contentWithoutImages),
                )
              : handleUnsupportedMarkdown(contentWithoutImages)
          }
          // ...
        />
        <ImageCarousel
          images={images} // Use the extracted images
          onImage-press={(uri) => setFullScreenImage(uri)}
        />
    // ...
  );
}
```

By implementing these two sets of changes, the performance warnings will be resolved, and the application will correctly process both raw Markdown and cooked HTML, ensuring images are always rendered properly in their carousel.
