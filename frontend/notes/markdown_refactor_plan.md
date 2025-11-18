# Markdown Rendering Refactor Plan

## 1. Executive Summary

The goal is to fully migrate the application's markdown rendering from the deprecated `react-native-markdown-display` to the more powerful `react-native-render-html`. This will resolve existing issues with HTML content and image handling, fix the `key` prop warning, and establish a consistent, maintainable approach to rendering posts, comments, and other user-generated content.

**Recommendation:** Instead of maintaining two separate markdown rendering systems, we should refactor the entire codebase to use the new, improved `MarkdownRenderer.tsx` component. This will create a single source of truth for rendering and make future development easier.

---

## 2. Core Strategy: Separate Text and Image Rendering

The fundamental problem, including the `key` prop issue, stems from trying to render complex components like images *within* the markdown/HTML renderer. The most robust solution, already partially implemented in `PostItem.tsx` and `NestedComment.tsx`, is to separate these concerns.

**The Golden Rule:**
1.  **Pre-process HTML:** Before passing content to `MarkdownRenderer`, use a regular expression to find all `<img>` tags.
2.  **Extract Image URLs:** Pull the `src` URLs from these tags into an array.
3.  **Strip Image Tags:** Remove the `<img>` tags from the HTML string.
4.  **Render Separately:**
    *   Pass the clean, image-free HTML to `<MarkdownRenderer />`.
    *   Pass the array of image URLs to a dedicated `<ImageCarousel />` component, rendered right after the markdown content.

This pattern completely avoids the complexities of rendering images inside the HTML component, resolves the `key` prop bug, and gives us full control over how images are displayed (e.g., in a carousel).

---

## 3. Step-by-Step Implementation Plan

### Step 1: Enhance `MarkdownRenderer.tsx`

While the new component is a great start, we need to incorporate features from the deprecated components.

**A. Add Collapsible Block Support:**
The old `MarkdownContent.tsx` could handle `[details=Title]...[/details]` blocks. We need to replicate this. `react-native-render-html` supports custom renderers, which is perfect for this.

```typescript
// In MarkdownRenderer.tsx

import RenderHTML, { TNode, RenderersProps } from 'react-native-render-html';
import { Collapsible } from './Collapsible'; // Assuming you create a standalone Collapsible component

// ...

const renderers = {
  // This assumes your Discourse API wraps collapsible sections in a <details> tag.
  // If it uses a custom BBCode that becomes a div, you might target a class name.
  details: (props: RenderersProps) => {
    const { TDefaultRenderer, tnode } = props;
    const summaryNode = tnode.children.find(c => c.tagName === 'summary');
    const title = summaryNode?.children[0]?.data || 'Details';

    // Filter out the summary node to render only the content
    const contentTNode = {
      ...tnode,
      children: tnode.children.filter(c => c.tagName !== 'summary'),
    };

    return (
      <Collapsible title={title}>
        <TDefaultRenderer tnode={contentTNode} />
      </Collapsible>
    );
  },
  // ... other renderers like 'a'
};

// ... in the component return
<RenderHTML
  // ...
  renderers={renderers}
/>
```

You will need to create a `Collapsible.tsx` component based on the logic in the deprecated `MarkdownContent.tsx`.

**B. Ensure Image Stripping (Safety Net):**
To enforce our core strategy, we can add a custom `img` renderer that does nothing. This ensures no images ever get rendered by `RenderHTML`, even if the pre-processing step is missed.

```typescript
// In MarkdownRenderer.tsx renderers object

const renderers = {
  a: ({ TDefaultRenderer, ...props }) => { /* ... existing link logic ... */ },
  details: (props) => { /* ... collapsible logic ... */ },
  img: () => null, // Explicitly render nothing for images
};
```

### Step 2: Refactor Component by Component

Go through each file that uses a markdown component and apply the new pattern.

**Target Files:**
- `@src/components/PostItem/PostItem.tsx` (Already follows the pattern, good reference)
- `@src/components/NestedComment.tsx` (Already follows the pattern, good reference)
- `@src/components/RepliedPost.tsx`
- `@src/core-ui/ChatBubble.tsx`
- `@src/screens/Profile/Profile.tsx`
- `@src/screens/PostPreview.tsx`
- `@src/navigation/ProfileDrawerNavigator.tsx`
- `@src/screens/Chat/components/ChatMessageItem.tsx`

---

**Example Refactor for `@src/components/RepliedPost.tsx`:**

This component currently uses the old `<Markdown>`.

**Current Code:**
```tsx
// ...
import { Markdown } from './Markdown'; // This will be removed

function BaseRepliedPost(props: BaseRepliedPostProps) {
  // ...
  return (
    // ...
        <Markdown
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(markdownContent ?? undefined)}
          mentions={mentions ?? undefined}
        />
    // ...
  );
}
```

**New Code:**
```tsx
// ...
import { MarkdownRenderer } from './MarkdownRenderer';
import { getCompleteImageVideoUrls } from '../helpers/api/processRawContent';
// No ImageCarousel needed here as replies are usually simple text.

function BaseRepliedPost(props: BaseRepliedPostProps) {
  const styles = useStyles();
  const { avatar, username, markdownContent, mentions, hideAuthor } = props;

  // Apply the image stripping pattern for consistency, even if images are rare in replies.
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';

  return (
    <View style={styles.nestedRowContainer}>
      <Divider vertical />
      <View style={styles.nestedCommentContainer}>
        {!hideAuthor && <Author image={getImage(avatar)} title={username} />}
        <MarkdownRenderer
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(contentWithoutImages ?? undefined)}
        />
      </View>
    </View>
  );
}
```

---

**Refactor Plan for Other Files:**

*   **`@src/core-ui/ChatBubble.tsx` & `@screens/Chat/components/ChatMessageItem.tsx`:**
    *   Replace `<Markdown>` with `<MarkdownRenderer>`.
    *   These components likely don't need to render images, so just passing the `content` prop after stripping images should be sufficient. The `nonClickable` prop should be passed down correctly.

*   **`@screens/Profile/Profile.tsx` & `@navigation/ProfileDrawerNavigator.tsx`:**
    *   These render user bios. Replace `<Markdown>` with `<MarkdownRenderer>`.
    *   User bios are unlikely to contain images or complex layouts, so a direct replacement is likely all that's needed.

*   **`@src/screens/PostPreview.tsx`:**
    *   This component already uses `MarkdownRenderer`.
    *   The line `content={MarkdownRenderer(content, imageUrls)}` looks incorrect. It should be `content={content}`. The `imageUrls` should be handled separately.
    *   Ensure it follows the image stripping pattern before rendering the preview. The preview should show the text, and you can decide if you want to show the extracted images underneath it using the `<ImageCarousel />`.

### Step 3: Address `PostDetail.tsx` and the "key" Prop Issue

You mentioned the `key` prop error specifically for `PostDetail.tsx` and `PostDetailHeader.tsx`.

**Cause:** The error happens when `react-native-markdown-display` (and sometimes `react-native-render-html` with custom renderers) creates a list of elements from the markdown. If one of those elements is a custom component (like your old `renderImage` function returning `<AuthenticatedImage>`), React requires a unique `key` prop on that component to manage the list efficiently. The error message clearly indicates that a `key` was being passed inside a props object via spread syntax (`{...props}`), which React forbids.

**Solution:** The core strategy of separating text and image rendering **completely solves this problem**. By stripping `<img>` tags from the HTML string *before* it's passed to `MarkdownRenderer`, the renderer never sees any images and never has to create a list of image components. The `ImageCarousel` will handle its own list of images correctly, applying keys as needed.

### Step 4: Final Cleanup

Once all components have been refactored and tested:

1.  **Delete the `deprecated` directory:** Remove `/Users/emil/Documents/Tænketanken/discourse/deprecated/`.
2.  **Remove old dependencies:** If `react-native-markdown-display` is still in your `package.json`, remove it.

---

## 4. Testing Strategy

After implementing the changes, perform a thorough manual test of all affected screens:

1.  **Content Rendering:** Verify that text, links, mentions, blockquotes, and lists render correctly in posts, comments, replies, chat bubbles, and user profiles.
2.  **Image Rendering:**
    *   Confirm that images are no longer rendered inside the main text content.
    *   Ensure the `ImageCarousel` appears correctly below the text for posts that have images.
    *   Test the carousel's scroll functionality.
    *   Test tapping on an image to open the full-screen view and swiping/tapping to close it.
3.  **Interaction:**
    *   Test tapping on `@mentions` to navigate to user profiles.
    *   Test tapping on internal links to navigate to other posts/topics.
    *   Test tapping on external links to open the browser.
4.  **Collapsible Sections:** Test that collapsible sections in posts expand and collapse correctly.
5.  **Error Check:** Keep an eye on the Metro console to ensure the `key` prop warning is gone.
