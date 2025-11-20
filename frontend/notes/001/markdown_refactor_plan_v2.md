# Markdown Refactor Plan (v2 - Validated)

## 1. Executive Summary & Strategy Confirmation

The goal is to fully migrate the application to `react-native-render-html`. The core strategy, as outlined previously, is to **separate text and image rendering**. This is achieved by pre-processing the HTML to extract image URLs into an array (for an `<ImageCarousel />`) and stripping the `<img>` tags before passing the HTML to `<MarkdownRenderer />`.

**Validation:** The provided `mockPostWithCollapsible` confirms that our plan for handling collapsible sections is correct. The Discourse API generates standard `<details>` and `<summary>` HTML tags, which we can target perfectly with a custom renderer.

---

## 2. Step-by-Step Implementation Plan

### Step 1: Create the `Collapsible.tsx` Component

First, create a new standalone `Collapsible` component. This logic can be extracted from the deprecated `MarkdownContent.tsx`.

**File: `@src/components/Collapsible.tsx`**
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
    overflow: 'hidden', // Ensures children conform to border radius
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

### Step 2: Enhance `MarkdownRenderer.tsx`

Now, update `MarkdownRenderer.tsx` to use the new `Collapsible` component and to safely ignore images.

**File: `@src/components/MarkdownRenderer.tsx`**
```tsx
import React from 'react';
// ... other imports
import RenderHTML, { MixedStyleDeclaration, RenderersProps } from 'react-native-render-html';
import { Collapsible } from './Collapsible'; // Import the new component

// ...

export function MarkdownRenderer({ content, fontColor, style, nonClickable }: Props) {
  // ... existing hooks and styles

  const tagsStyles: Readonly<Record<string, MixedStyleDeclaration>> = {
    // ... existing base styles (body, p, blockquote, etc.)
  };

  const renderers = {
    // Custom renderer for <a> tags (existing logic)
    a: ({ TDefaultRenderer, ...props }: any) => {
      // ... existing link and mention logic ...
    },

    // NEW: Custom renderer for <details> tags
    details: (props: RenderersProps) => {
      const { TDefaultRenderer, tnode } = props;
      const summaryNode = tnode.children.find((c) => c.type === 'tag' && c.tagName === 'summary');
      
      // Extract title from the <summary> tag
      const title = summaryNode?.children[0]?.data || 'Details';

      // Create a new tnode for the content, excluding the <summary> part
      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c) => c !== summaryNode),
      };

      return (
        <Collapsible title={title}>
          {/* Render the rest of the content inside the collapsible */}
          <TDefaultRenderer tnode={contentTNode} {...props} />
        </Collapsible>
      );
    },

    // NEW: Safety-net renderer to explicitly ignore <img> tags
    img: () => null,
  };

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

// ... useStyles
```

### Step 3: Refactor All Components Using Markdown

This step remains the same. Systematically go through each file listed below, replace the old `<Markdown>` or `<MarkdownContent>` with the enhanced `<MarkdownRenderer>`, and apply the image-stripping pattern.

import { getCompleteImageVideoUrls } from '../../../src/helpers/api/processRawContent';


**The Image Stripping Pattern:**
```tsx
// In the component that needs to render content...
const imageTagRegex = /<img[^>]*>/g;
const images = getCompleteImageVideoUrls(content) || []; // Or a similar helper
const contentWithoutImages = content ? content.replace(imageTagRegex, '') : '';

// ... in the JSX
<MarkdownRenderer content={contentWithoutImages} />
<ImageCarousel images={images} onImagePress={...} />
```

**Target Files for Refactoring:**
- `@src/components/PostItem/PostItem.tsx` (Good reference)
- `@src/components/NestedComment.tsx` (Good reference)
- `@src/components/RepliedPost.tsx`
- `@src/core-ui/ChatBubble.tsx`
- `@src/screens/Profile/Profile.tsx`
- `@src/screens/PostPreview.tsx`
- `@src/navigation/ProfileDrawerNavigator.tsx`
- `@src/screens/Chat/components/ChatMessageItem.tsx`

### Step 4: Final Cleanup

After refactoring and testing:
1.  Delete the `deprecated` directory.
2.  Uninstall `react-native-markdown-display` from `package.json` if it's still there (`yarn remove react-native-markdown-display`).

This validated plan provides a clear and robust path to a modern, maintainable, and bug-free markdown rendering system for the entire application.
