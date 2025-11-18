# Final Plan: Fix Post Detail Layout Clipping

## 1. Analysis (Confirmed)

The investigation has pinpointed the exact cause:
*   **Context:** `PostDetail` renders the main post content (text + images) inside the `ListHeaderComponent` prop of a `FlatList`.
*   **The Issue:** `FlatList` measures its header component **once**. If a child component (like our `ImageCarousel` inside `PostItem`) determines its size *after* the initial mount (even synchronously during render), the `ListHeaderComponent` container might not resize to fit it, effectively "clipping" the content that renders below the initial text.
*   **Why Home Works:** On the HomeScreen (`PostPreview`), `PostItem` is likely a direct child of a `renderItem` or a `ScrollView`, which are more forgiving and reflow layout automatically when children change size.

## 2. Solution

We need to ensure the `ListHeaderComponent` can grow dynamically or move the content out of the header. Since `PostDetail` is designed to be a scrollable list of comments *below* the main post, moving it out isn't ideal (we want it to scroll away).

**The Fix:** Wrap the `PostDetailHeaderItem` content in a `View` with `onLayout` handling? No, simpler.
The `ImageCarousel` *already* calculates its height synchronously now (thanks to our previous fix).
The issue is likely that `AuthenticatedImage` inside it is loading and *then* rendering. But we fixed `ImageCarousel` to have a fixed height container!

**Wait**, look at `PostItem.tsx`:
```typescript
      <TouchableOpacity onPress={onPressPost} delayPressIn={200}>
        {mainContent}
      </TouchableOpacity>
      {pollsContent}
      {imageContent}
```
It renders `mainContent` (text), then `polls`, then `images`.

If `mainContent` (Markdown) takes time to render (it uses `react-native-render-html`), the `ListHeader` might measure itself *before* the images are ready/layouted, especially if `ImageCarousel` was initially returning `null` (if images array was empty or filtered).

**But we verified data flow:** Images ARE passed.

**Alternative Hypothesis:**
The `CustomFlatList` might be enforcing a style on `ListHeaderComponent` or not updating layout.

**Strategy:**
We will move the `ImageCarousel` layout calculation logic **UP** to `PostDetailHeaderItem` or `PostItem` and enforce a minimum height on the container holding both text and images, OR simply give `PostDetailHeaderItem` a style of `{ flexGrow: 1 }`.

**Actually, the most robust fix for `ListHeaderComponent` clipping issues is:**
Ensure `PostItem` (the root of the header) has `onLayout` attached to trigger a re-measure? No, React Native handles that.

**Let's look at `PostDetail.tsx` styling.**
```typescript
          ListHeaderComponent={
            <PostDetailHeaderItem ... />
          }
```
If `PostDetailHeaderItem` returns `null` initially (e.g., while loading `useFragment`), then updates, it should grow.

**Wait!** The logs showed:
`LOG [PostDetailHeaderItem] Rendering: ...`
It *is* rendering.

**Is it possible `ImageCarousel` is being rendered with `position: 'absolute'` somewhere?** No.

**Let's try the "Magic Fix" for FlatList Headers:**
Wrap the `ListHeaderComponent` content in a `View` with `style={{ flex: 1 }}` (or no style) but **ensure it handles layout changes.**

**Proposed Fix:**
1.  **Verify `CustomFlatList`:** Check if it wraps the header in a View.
2.  **Force Re-render:** Add a `key` to `PostDetailHeaderItem` that changes when `images` loads? No, images are passed immediately.

**Let's go with the "Move Out" Strategy (safest for investigation):**
If we change `PostDetail.tsx` to render `PostDetailHeaderItem` *outside* the `FlatList` (e.g., in a `ScrollView` alongside the list? No, scrolling would be separate).

**Back to `PostItem.tsx`:**
```typescript
  return (
    <>
      <View
        style={[styles.container, pinned && styles.pinnedBorder, style]}
        {...otherProps}
      >
        {wrappedMainContent}
        {footer}
      </View>
// ...
```
`styles.container` has `backgroundColor: colors.background`.

**CRITICAL FINDING:**
In `ImageCarousel.tsx`, we added:
```typescript
  if (!images || images.length === 0) {
    return null;
  }
```
In `PostDetailHeaderItem`, `images` comes from `getCompleteImageVideoUrls`.
If `markdownToHtml` returns empty string initially, `images` is empty -> `ImageCarousel` returns `null`.
Then content updates -> `images` populates -> `ImageCarousel` renders.
**If `FlatList` header doesn't re-measure on height change, it clips.**

**Refined Plan:**
1.  **Force Re-measurement:** In `PostDetail.tsx`, wrap `PostDetailHeaderItem` in a `View` with `onLayout`. This usually forces the List to see the size change.
2.  **Debug Style:** Add `backgroundColor: 'red'` to `ImageCarousel` container to see if it's there but empty.

**But wait**, we *already* calculate height in `ImageCarousel`.
`const carouselHeight = Math.max(contentWidth / aspectRatio, 200);`
It *always* has height if `images.length > 0`.

**Is it possible `contentWidth` is 0?**
Logs: `[ImageCarousel] Layout: {"contentWidth": 392...}`. No.

**Let's look at `PostDetail.tsx` again.**
```typescript
<CustomFlatList
  // ...
  ListHeaderComponent={
    <PostDetailHeaderItem ... />
  }
```

**Action:**
I will modify `PostDetail.tsx` to wrap the header in a `View` that ensures it takes up space.

**Better yet:**
I will add a temporary **"Debug Border"** to `PostItem` and `ImageCarousel` to visualize the layout on screen. If we see the red border but no image, it's an internal render issue. If we don't see the border, it's clipped.

**Hypothesis:** `MarkdownRenderer` might be crashing or taking up infinite height? No, text renders.

**Let's try this:**
In `PostItem.tsx`, `ImageCarousel` is inside `{imageContent}`.
`imageContent` is:
```typescript
  const imageContent = (
    <ImageCarousel
      images={images}
      onImagePress={(uri) => setFullScreenImage(uri)}
      serverDimensions={imageDimensions}
    />
  );
```

**Check `serverDimensions` passed to `PostDetailHeaderItem`!**
`PostDetailHeaderItem` does **not** receive or pass `imageDimensions`!
It calls `PostItem` without it.
So `ImageCarousel` sees `undefined`.
`AuthenticatedImage` sees `undefined`.
It calculates based on `1.77` aspect ratio.
Height is ~200.

**Why invisible?**

**Maybe `images` array in `PostItem` is NOT what we think it is?**
We logged in `PostDetailHeaderItem`.
But `PostItem` does:
```typescript
const images = propImages ?? (getCompleteImageVideoUrls...);
```
If `propImages` is passed, it uses it.

**Wait, look at the logs again:**
`LOG [PostDetailHeaderItem] Rendering: {"firstImage": "...", "imagesCount": 2, "topicId": 49}`
This confirms `PostDetailHeaderItem` HAS images.

**Is `PostItem` receiving them?**
Let's add a log to `PostItem.tsx`.

**AND** let's check `src/components/CustomFlatList/CustomFlatList.tsx`. Maybe it handles headers weirdly.

**But first, let's try the layout fix.**
I will force the `ListHeaderComponent` container in `PostDetail.tsx` to be flexible.

**File:** `src/screens/PostDetail/PostDetail.tsx`
Wrap `PostDetailHeaderItem` in a `View`.

```typescript
ListHeaderComponent={
  <View onLayout={(e) => console.log('Header Layout:', e.nativeEvent.layout)}>
    <PostDetailHeaderItem ... />
  </View>
}
```

**Wait, I see `PostDetailSkeletonLoading`.**
If `isLoading` is true, it returns Skeleton.
Logs show `PostDetailHeaderItem` rendering, so loading is false.

**One possibility:**
`AuthenticatedImage` uses `Image` from `expo-image`.
If `source` is invalid (e.g. bad headers), it might render nothing.
But `HomeScreen` uses the same component and works.

**Difference:**
HomeScreen uses `PostItem`. PostDetail uses `PostDetailHeaderItem` -> `PostItem`.
Both use `AuthenticatedImage`.

**Let's try to "kick" the layout.**
I will modify `PostDetail.tsx` to add a slight delay or force update? No.

**Let's modify `PostItem.tsx` to log what IT receives.**
This is the most critical missing piece of info. Does `PostItem` receive the images?

**Plan:**
1.  Add logs to `PostItem.tsx` to confirm it receives `images` prop.
2.  Add `backgroundColor: 'red'` to `ImageCarousel` wrapper in `PostItem` to see if it occupies space.

This visual debugging is faster than guessing.
