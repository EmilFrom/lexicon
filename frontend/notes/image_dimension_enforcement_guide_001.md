# Image Dimension Enforcement Guide (ELI5)

## Goal
We want to make sure every image in the app looks perfect. To do this, we need to know exactly how wide and tall each image is *before* we show it. We get this information from the server (the "API").
We want to forbid the app from guessing the size or using a fixed box size unless it has absolutely no other choice.

## The "No Static Size" Rule
1.  **Always ask the server:** Before showing an image, ask the API "How big is this?"
2.  **Use what the server says:** If the server says "It's 100 wide and 200 tall", make the image exactly that shape.
3.  **Only guess if you have to:** If the server doesn't know, *only then* can you use a safe fallback (like a square), but try to avoid this.

---

## Step-by-Step Implementation

### 1. The "Asker" (The Hook)
We need a tool that automatically asks the server for dimensions whenever we have a list of image URLs.

**File:** `src/hooks/useImageDimensions.ts`
*This hook already exists (implied by context), but let's make sure it's used everywhere.*

### 2. The "Boss" (PostItem Component)
The `PostItem` is where we decide what to show. It needs to use the "Asker" tool.

**File:** `src/components/PostItem/PostItem.tsx`

**How it works now (and should work):**
1.  **Find Images:** It looks at the post content and finds all the image links.
2.  **Ask the Server:** It calls `useImageDimensions(images)`. This talks to the API.
3.  **Get the Map:** The API gives back a "Map" (a list) that says:
    *   `image1.jpg`: 500x500
    *   `image2.png`: 800x600
4.  **Pass it Down:** It gives this Map to the `ImageCarousel`.

**Checklist for `PostItem`:**
- [ ] Does it use `useImageDimensions`? **Yes.**
- [ ] Does it pass the result (`imageDimensionsMap`) to `ImageCarousel`? **Yes.**

### 3. The "Manager" (ImageCarousel Component)
The carousel shows the images. It needs to look at the Map it got from the Boss and tell each image its size.

**File:** `src/components/ImageCarousel.tsx`

**Logic:**
1.  **Look up the size:** For each image URL, look in the `imageDimensionsMap`.
2.  **Calculate the Container:**
    *   Use the aspect ratio from the Map.
    *   **Crucial:** If the Map has info, `width` is the screen width, and `height` is `width / aspectRatio`.
    *   **Fallback:** If the Map has NO info, default to `1.0` (Square). *Do not default to a fixed pixel height like 300px unless necessary for safety.*
3.  **Pass to Child:** Give the `serverDimensions` to the `AuthenticatedImage`.

### 4. The "Worker" (AuthenticatedImage Component)
This is the component that actually draws the image.

**File:** `src/core-ui/AuthenticatedImage.tsx`

**Strict Rules for this file:**
1.  **Accept `serverDimensions`:** It must take a prop called `serverDimensions`.
2.  **Calculate Aspect Ratio:**
    *   If `serverDimensions` exists: `aspectRatio = width / height`.
    *   If NOT: `aspectRatio = 1.0` (or `1.77`).
3.  **Set Height:**
    *   `height = screenWidth / aspectRatio`.
4.  **NO STATIC HEIGHTS:**
    *   **Bad:** `style={{ height: 200 }}`
    *   **Good:** `style={{ aspectRatio: aspectRatio }}`
    *   *Exception:* If the calculated height is 0 or NaN (error), fall back to a safe number like 300 to prevent a crash.

---

## Verification Checklist
To be 100% sure we are following the rules:

1.  **Search for `height: 300` (or similar numbers):**
    *   Run a search in `src/` for hardcoded numbers in styles. Remove them if they are for dynamic images.
    *   *Note:* Layout skeletons (loading states) *can* have fixed heights. Real images should not.

2.  **Check `ImageCarousel.tsx`:**
    *   Ensure it uses `imageDimensionsMap`.
    *   Ensure it passes `serverDimensions={specificDims}` to `AuthenticatedImage`.

3.  **Check `AuthenticatedImage.tsx`:**
    *   Ensure it prioritizes `serverDimensions.aspectRatio`.
    *   Ensure it calculates height dynamically based on width.

## Troubleshooting "Tiny Images" or "Cropped Images"
-   **Problem:** Image looks like a thin strip.
    -   **Cause:** `serverDimensions` might be missing, defaulting to a wide aspect ratio, or the math `width / height` is inverted.
    -   **Fix:** Check the API response. Ensure `width` and `height` are correct.

-   **Problem:** Image is huge and takes up the whole screen.
    -   **Cause:** Aspect ratio is very tall (e.g., a long infographic).
    -   **Fix:** `ImageCarousel` has a `MAX_HEIGHT_RATIO` cap (currently 5x width). This is good protection. Keep it.

## Final Note
By forcing every image to go through `useImageDimensions` -> `PostItem` -> `ImageCarousel` -> `AuthenticatedImage`, we guarantee that the server controls the size, and the app adapts perfectly.
