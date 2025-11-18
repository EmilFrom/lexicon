# Final Troubleshooting Plan: Post Detail Images

## 1. Current Status
*   **Fixes Applied:**
    *   `PostItem.tsx`: Updated to use `images` prop (alias `propImages`).
    *   `markdownToHtml.ts`: Enabled `html: true` in MarkdownIt.
    *   `AuthenticatedImage.tsx`: Optimized with `useMemo` and `cachePolicy`.
*   **Result:**
    *   HomeScreen (PostPreview): Images render perfectly.
    *   PostDetail: Images are **still blank**.
*   **Investigation:**
    *   The data flow seems correct: `PostDetailHeaderItem` -> `PostItem` -> `ImageCarousel`.
    *   The images are being extracted (verified by logs in previous steps).
    *   **Critical Clue:** The network logs (`network-log (4).har`) show calls to `/t/49.json` returning data, but the image download requests might be failing or not being initiated correctly for the *detail* view specifically.
    *   **Hypothesis:** There might be a styling issue (height/width) specific to how `PostDetail` renders `PostItem`, OR the `imageDimensions` logic is returning 0/null, causing the container to collapse.

## 2. Proposed Debugging & Fixes

### Step 1: Force Dimensions in `AuthenticatedImage` (Sanity Check)
The `AuthenticatedImage` component calculates height based on `serverDimensions` or `screenWidth / aspectRatio`. If `aspectRatio` is missing or invalid, it might be collapsing.

**Action:** Add a fallback minimum height to `AuthenticatedImage` to ensure it's not just a 0-height view.

### Step 2: Debug Logging in `PostDetailHeaderItem`
We need to verify exactly what is being passed to `PostItem`.

**Action:** Add a `console.log` in `PostDetailHeaderItem.tsx` right before the return statement.
```typescript
console.log('[PostDetailHeaderItem] Rendering PostItem with:', {
  imagesLength: images.length,
  firstImage: images[0],
  topicId,
  contentLength: contentWithoutImages.length
});
```

### Step 3: Verify `getCompleteImageVideoUrls` Logic
The regex logic in `processRawContent.ts` is complex. It relies on `discourseHost`. If `markdownToHtml` is now returning full HTML, the regex might need to be adjusted if it was expecting something slightly different or if the host handling is double-prefixing.

**Action:** Review `getCompleteImageVideoUrls` in `src/helpers/api/processRawContent.ts`. The `imageVideoTagRegex` looks for `src="..."`. Since we enabled `html: true`, the content passed to this function is now real HTML. This *should* be correct, but we must verify if the `src` attributes are absolute or relative URLs.

### Step 4: Check `PostItem` Styling
In `PostDetail`, `PostItem` is rendered as a `ListHeaderComponent`. Ensure that the `ImageCarousel` inside it isn't being constrained by a parent view with `flex: 0` or similar issues.

## 3. Immediate Action Plan (Code Changes)

I will apply a robust fallback to `AuthenticatedImage.tsx` to rule out layout collapse.

**File:** `src/core-ui/AuthenticatedImage.tsx`

**Change:**
```typescript
  // ... inside calculateImageHeight ...
  // Fallback to a default height if calculation results in 0 or NaN
  if (!calculatedHeight || isNaN(calculatedHeight)) {
      return 200; // Default fallback height
  }
  return Math.min(calculatedHeight, maxHeight);
```

And add logs to `PostDetailHeaderItem.tsx`.

## 4. Approval
Please confirm if I should proceed with injecting these debug logs and the height fallback.
