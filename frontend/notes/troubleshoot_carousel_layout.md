# Plan: Fix Image Rendering in PostDetail

## 1. Analysis

The logs confirm that data is flowing correctly:
*   `PostDetailHeaderItem` has 2 images.
*   The first image URL is valid.
*   `topicId` is 49.

However, images are still not visible. We have ruled out:
*   **Data flow:** The data reaches `PostItem`.
*   **HTML Parsing:** `markdownToHtml` is working (implied by images being extracted).
*   **Layout Collapse:** We added a fallback height of 300px to `AuthenticatedImage`, so it should be taking up space.

**Remaining Suspects:**
1.  **Styling Issue in `ImageCarousel`:** The container width logic in `ImageCarousel` might be calculating a width of 0 or a negative value, or the `ScrollView` content container style is restricting layout.
2.  **`contentWidth` Calculation:** The logic `const contentWidth = windowWidth - styles.container.paddingHorizontal * 2;` relies on `styles.container.paddingHorizontal`. If this style value is undefined or not a number (e.g., a string from the theme), the calculation `windowWidth - NaN` results in `NaN`, breaking the layout.
3.  **Parent Container Constraints:** `PostDetail` renders `PostItem` inside a `ListHeaderComponent` of a `FlatList`. If that header component doesn't have a defined width (or `flex: 1`), children might not render correctly.

## 2. Investigation Steps

### Step 1: Audit `ImageCarousel.tsx`
I will inspect `ImageCarousel.tsx` to verify the width calculation.

**Hypothesis:** `styles.container.paddingHorizontal` might be coming from a theme variable that isn't a simple number, or the `makeStyles` utility isn't returning what we expect for this calculation context.

### Step 2: Debug `AuthenticatedImage` Dimensions
I will add a log inside `AuthenticatedImage` to see the *actual* width and height it is trying to render.

## 3. Proposed Fix (Pre-emptive)

I suspect the `contentWidth` calculation is the culprit. To fix this robustly:
1.  Use `onLayout` to get the real width of the container instead of relying on `windowWidth` minus padding.
2.  Or, simplify the styling to use percentages/flexbox which react-native handles better than manual pixel math.

Let's try a **Simplified Styling Approach** for `ImageCarousel`.

**Proposed `ImageCarousel.tsx` Refactor:**
*   Remove manual `contentWidth` calculation.
*   Use a simple `width: '100%'` on the `ScrollView`.
*   Use `pagingEnabled` with `snapToInterval`.

**Wait, `pagingEnabled` on Android requires exact width.**
Better approach: Keep the calculation but make it safer.

## 4. Action Plan

1.  **Debug `ImageCarousel`:** Add logs to see what `contentWidth` calculates to.
2.  **Fix `ImageCarousel`:** If `contentWidth` is the issue, fallback to `windowWidth`.

Let's update `ImageCarousel.tsx` to be more robust.

**File:** `src/components/ImageCarousel.tsx`

**Update:**
```typescript
  // Fallback if padding isn't a number
  const padding = typeof styles.container.paddingHorizontal === 'number' 
    ? styles.container.paddingHorizontal * 2 
    : 48; // Default fallback (24 * 2)
    
  const contentWidth = windowWidth - padding;

  if (__DEV__) {
    console.log('[ImageCarousel] Width:', { windowWidth, padding, contentWidth });
  }
```

I will create an implementation guide to add this logging and safety check. This is the most likely point of failure given the symptoms.
