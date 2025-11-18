# Plan: Fix Missing Images on Post Detail

## 1. Analysis

**Issue:** Images are not rendering on the `PostDetail` screen, even though the "white screen" flickering issue is resolved.

**Root Cause:**
1.  `PostDetailHeaderItem` (the wrapper) correctly extracts images from the raw HTML and strips them from the text content to avoid duplication. It passes two props to the child component:
    *   `content`: The text *without* images.
    *   `images`: The array of extracted image URLs.
2.  `PostItem` (the child component) **ignores the `images` prop**. It attempts to re-extract images from the `content` prop.
3.  Since `PostDetailHeaderItem` already removed the images from `content`, `PostItem` finds nothing, resulting in an empty image carousel.

**Verification:**
In `src/components/PostItem/PostItem.tsx`:
```typescript
function BasePostItem(props: Props) {
  const {
    content,
    // 'images' is NOT destructured here!
    ...otherProps 
  } = props;

  // PostItem re-runs extraction on 'content', which is empty of images by now
  const images = getCompleteImageVideoUrls(htmlContent)... 
```

## 2. Plan

**Objective:** Update `PostItem` to respect the `images` prop passed from its parent.

**File:** `src/components/PostItem/PostItem.tsx`

**Implementation Details:**
1.  Destructure `images` (aliased as `propImages` to avoid naming conflict) from `props`.
2.  Update the "Content Processing Pattern" logic:
    *   If `propImages` exists, use it directly and treat `content` as already processed (or process strictly for formatting).
    *   If `propImages` does not exist (legacy behavior or other screens), continue extracting images from `content`.

**Proposed Code Change:**
```typescript
  const {
    // ... existing props
    content,
    images: propImages, // <--- Add this
    // ...
  } = props;

  // ...

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  
  // Prefer passed images, otherwise extract them
  const images = propImages ?? (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || []);
  
  // If propImages was passed, we assume content is already cleaned OR we clean it again.
  // PostDetailHeaderItem passes cleaned content, so cleaning it again is harmless (regex won't match).
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---
```

## 3. Approval
This change is low-risk and directly addresses the data flow issue identified in the investigation.
