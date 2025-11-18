# Implementation Guide: Fix Missing Images in Post Detail View

## Overview
This guide details the steps required to fix the issue where images are not displaying in the Post Detail view (specifically the `PostDetailHeaderItem`). The root cause is that the `ImageCarousel` component is explicitly omitted from the rendering logic when the `PostItem` is in `nonclickable` mode (which is the mode used for the detail view).

## Action Plan

### 1. Modify `src/components/PostItem/PostItem.tsx`

You need to update the `wrappedMainContent` variable logic to include `{imageContent}` in the `else` branch.

**Location:** Around line 225 in `src/components/PostItem/PostItem.tsx`.

**Current Code:**
```typescript
  const wrappedMainContent = !nonclickable ? (
    <>
      {/* ... existing clickable content ... */}
    </>
  ) : (
    <>
      {contentTitle}
      {author}
      {mainContent}
      {pollsContent}
    </>
  );
```

**Required Change:**
Add `{imageContent}` to the non-clickable fragment.

**New Code:**
```typescript
  const wrappedMainContent = !nonclickable ? (
    <>
      {/* ... existing clickable content ... */}
    </>
  ) : (
    <>
      {contentTitle}
      {author}
      {mainContent}
      {pollsContent}
      {imageContent}
    </>
  );
```

### 2. Verification
After applying this change:
1.  Navigate to a Topic Detail page that contains images.
2.  Verify that the images are now visible (or the `ImageCarousel` debug colors are visible if you are debugging).
3.  Verify that the images appear below the main text content and poll content, which is the standard layout.