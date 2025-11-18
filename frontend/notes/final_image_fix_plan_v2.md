# Final Image Fix Plan V2

## 1. Analysis

The user reports two specific issues after the previous fix:
1.  **Images go blank after scrolling:** This persists despite the performance improvement. This is likely due to inefficient re-rendering of the `Image` component (recreating the `source` object) and potentially restrictive cache policy.
2.  **No images on PostDetail page:** The logs show the server returns HTML (`cooked`) content. The current `markdownToHtml` helper uses `MarkdownIt` with default settings, which **escapes HTML tags** (setting `html: false` by default). This causes `<img ...>` tags to be rendered as `&lt;img ...&gt;`, breaking the image extraction logic in `PostDetailHeaderItem`.

## 2. Plan

### Step 1: Fix `src/helpers/markdownToHtml.ts`
**Objective:** Allow HTML tags in Markdown content so that `<img>` tags from Discourse (which sends HTML/cooked content) are not escaped.

**Action:**
Update the `MarkdownIt` initialization to include `{ html: true }`.

### Step 2: Optimize `src/core-ui/AuthenticatedImage.tsx`
**Objective:** Prevent "blanking" during scrolling by ensuring efficient re-renders and optimal caching.

**Action:**
1.  **Memoize `source`:** Use `useMemo` to create the `source` object. This prevents the `Image` component from resetting/flickering when the parent re-renders but the URL/token hasn't changed.
2.  **Update `cachePolicy`:** Change `cachePolicy` to `'memory-disk'` (if supported) or ensure it allows memory caching to prevent slow disk reads during rapid scrolling.

## 3. Implementation Details

### `src/helpers/markdownToHtml.ts`
```typescript
import MarkdownIt from 'markdown-it';

// Initialize with html: true to prevent escaping of <img> tags
const md = new MarkdownIt({ html: true });

export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return md.render(markdown);
}
```

### `src/core-ui/AuthenticatedImage.tsx`
```typescript
// ... imports
import React, { useState, useMemo } from 'react'; // Add useMemo

// ... props definition

export function AuthenticatedImage({
  url,
  style,
  testID,
  onPress,
  showSkeleton = true,
  maxHeightRatio = 1.5,
  serverDimensions,
}: Props) {
  const token = useReactiveVar(tokenVar);
  // ...

  // MEMOIZE THE SOURCE
  const source = useMemo(() => ({
    uri: url,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }), [url, token]);

  // ... calculation logic

  const imageContent = (
    <View style={[styles.imageContainer, { height: imageHeight }, style]} testID={testID}>
      <Image
        source={source}
        style={styles.image}
        contentFit="cover"
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        cachePolicy="memory-disk" // Enable memory cache for scrolling performance
      />
      {/* ... skeleton and error logic ... */}
    </View>
  );
  
  // ... rest of file
}
```

## 4. Verification
1.  **PostDetail Images:** Verify images now appear on the Post Detail screen (HTML tags are no longer escaped).
2.  **Scrolling:** Verify images stay visible (don't blank out) when scrolling up and down in lists.
