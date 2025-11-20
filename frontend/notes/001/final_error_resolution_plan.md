# Final Error Resolution Plan

## Analysis of Remaining Errors

The current errors are predictable follow-ups to the initial refactoring. They fall into three distinct categories: module resolution (a missing file), scope/order of operations (variables used before declaration), and incorrect import paths. This plan will resolve them systematically.

---

### 1. Critical Error: The Missing `Collapsible.tsx` Component

**File with Error:** `src/components/MarkdownRenderer.tsx`
**Error Message:** `Cannot find module './Collapsible' or its corresponding type declarations.`

**Analysis:**
This is the most critical error and the root cause of the problem in `MarkdownRenderer.tsx`. The error message is unequivocal: TypeScript cannot find the `Collapsible.tsx` file that `MarkdownRenderer` is trying to import. The previous plan detailed *how* to create this file, and this error confirms that the file does not yet exist at the expected location (`src/components/Collapsible.tsx`).

**Solution:**
Create the `src/components/Collapsible.tsx` file and populate it with the correct, self-contained code. This will allow `MarkdownRenderer` to successfully import and use it.

**Action:**
Create a new file named `Collapsible.tsx` inside the `src/components/` directory with the following content:

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

### 2. Scope & Declaration Order Errors

**Files with Errors:**
- `src/components/RepliedPost.tsx`
- `src/navigation/ProfileDrawerNavigator.tsx`
- `src/screens/PostPreview.tsx`

**Error Messages:**
- `Block-scoped variable '...' used before its declaration.`
- `Cannot find name '...'`

**Analysis:**
These errors all stem from the same logical mistake: using a variable before it has been declared within its scope. In JavaScript and TypeScript, you must declare a variable with `const`, `let`, or `var` before you can reference it. This often happens during refactoring when lines of code are moved around.

**Solution:**
In each file, we must ensure that all variables are declared before they are used.

**Action for `RepliedPost.tsx`:**
- The `contentWithoutImages` variable is used before it's defined. The props need to be destructured first.

**Before:**
```tsx
function BaseRepliedPost(props: BaseRepliedPostProps) {
  const styles = useStyles();

  // ERROR: markdownContent is used here...
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';

  // ...but declared here.
  const { avatar, username, markdownContent, mentions, hideAuthor } = props;
  // ...
}
```

**After (Corrected Order):**
```tsx
function BaseRepliedPost(props: BaseRepliedPostProps) {
  const styles = useStyles();

  // 1. Destructure props first.
  const { avatar, username, markdownContent, mentions, hideAuthor } = props;

  // 2. Now declare variables that depend on props.
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';

  return (
    // ...
        <MarkdownRenderer
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(contentWithoutImages ?? '')}
        />
    // ...
  );
}
```

**Action for `ProfileDrawerNavigator.tsx`:**
- The `bioContent` variable is declared using `splittedBio` and `user` before they are initialized by their respective `useState` hooks.

**Before:**
```tsx
function DrawerContent({ state }: DrawerContentComponentProps) {
  // ...
  const bioContent = (splittedBio && splittedBio.length > 3 // ERROR: splittedBio used here...
      ? `${splittedBio.slice(0, 3).join('\n')}...`
      : user.bioRaw) || ''; // ...and user is used here.

  const [user, setUser] = useState<UserDetail>({ /* ... */ }); // ...but they are declared later.
  const [splittedBio, setSplittedBio] = useState<Array<string>>();
  // ...
}
```

**After (Corrected Order):**
```tsx
function DrawerContent({ state }: DrawerContentComponentProps) {
  // ...
  // 1. Declare state variables first.
  const [user, setUser] = useState<UserDetail>({ /* ... */ });
  const [splittedBio, setSplittedBio] = useState<Array<string>>();

  // ... (hooks like useProfile come here)

  // 2. Now declare variables that depend on state.
  const bioContent = (splittedBio && splittedBio.length > 3
      ? `${splittedBio.slice(0, 3).join('\n')}...`
      : user.bioRaw) || '';

  return (
    // ...
        <MarkdownRenderer // Changed from Markdown to MarkdownRenderer for consistency
          content={bioContent}
          style={styles.bioContainer}
        />
    // ...
  );
}
```

**Action for `PostPreview.tsx`:**
- The variables `contentWithoutImages` and `imagesFromContent` are used in the JSX but were never declared.

**Before:**
```tsx
export default function PostPreview() {
  // ...
  return (
    // ...
        <MarkdownRenderer
          content={contentWithoutImages} // ERROR: Not defined
          style={styles.markdown}
          nonClickable={true}
        />
        <ImageCarousel
          images={imagesFromContent} // ERROR: Not defined
          onImagePress={(uri) => setFullScreenImage(uri)}
        />
    // ...
  );
}
```

**After (Declarations Added):**
```tsx
export default function PostPreview() {
  // ...
  const { title, raw: content, tags, channelId, isDraft } = getValues();
  // ...

  // ADD THESE LINES before the return statement
  const imageTagRegex = /<img[^>]*>/g;
  const imagesFromContent = getCompleteImageVideoUrls(content) || [];
  const contentWithoutImages = content ? content.replace(imageTagRegex, '') : '';

  return (
    // ...
        <MarkdownRenderer
          content={contentWithoutImages} // Now this works
          style={styles.markdown}
          nonClickable={true}
        />
        <ImageCarousel
          images={imagesFromContent} // And this works
          onImagePress={(uri) => setFullScreenImage(uri)}
        />
    // ...
  );
}
```

---

### 3. Incorrect Import Path

**File with Error:** `src/screens/Chat/components/ChatMessageItem.tsx`
**Error Message:** `Module '"../../../helpers"' has no exported member 'getCompleteImageVideoUrls'.`

**Analysis:**
This error is straightforward. The `getCompleteImageVideoUrls` function is not exported from the main `helpers` barrel file (`index.ts`). It resides in a more specific utility file within the helpers directory. The auto-importer or manual import pointed to the wrong location.

**Solution:**
Correct the import path to point directly to the file containing the function. Based on the project structure, this is `src/helpers/api/processRawContent.ts`.

**Action:**
In `src/screens/Chat/components/ChatMessageItem.tsx`, find and replace the incorrect import.

**Before:**
```tsx
import {
  // ...
  getCompleteImageVideoUrls, // This is the incorrect line
  handleUnsupportedMarkdown,
} from '../../../helpers';
```

**After (Corrected Path):**
```tsx
import { getCompleteImageVideoUrls } from '../../../helpers/api/processRawContent'; // Corrected path
import {
  // ...
  handleUnsupportedMarkdown,
} from '../../../helpers';
```
