# Implementation Guide: Fix ImageCarousel Width Calculation

## Overview
A TypeScript error occurred because we removed `paddingHorizontal` from the `styles.container` object in `ImageCarousel.tsx` (to fix the double-padding issue), but the code still tries to read that property to calculate the content width.

To fix this and ensure the carousel pages correctly (which requires an accurate width), we will calculate the width by subtracting the parent `PostItem`'s known padding (`spacing.xxl`) from the window width.

## Changes

### 1. Modify `src/components/ImageCarousel.tsx`

**Current Code (Lines ~27-29):**
```typescript
  // 1. Calculate Width
  const paddingHorizontal = typeof styles.container.paddingHorizontal === 'number'
    ? styles.container.paddingHorizontal
    : 24; 
  const contentWidth = windowWidth - (paddingHorizontal * 2);
```

**New Code:**
You need to use the `spacing` object which is already available via the `useStyles` hook (which internally uses `makeStyles`). However, `makeStyles` usually passes theme variables to the callback. To access `spacing` directly in the component body, we should use the `useTheme` hook.

1.  Add `useTheme` to imports.
2.  Replace the width calculation logic.

**Updated File Content:**

```typescript
import { useTheme } from '../theme'; // Ensure this import exists

// ... inside component ...

export function ImageCarousel({ images, onImagePress, serverDimensions }: Props) {
  const styles = useStyles();
  const { spacing } = useTheme(); // Get spacing from theme
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  // 1. Calculate Width
  // The parent PostItem has horizontal padding of spacing.xxl.
  // The carousel itself has 0 horizontal padding now.
  // So the available width for the content is Window Width - (Parent Padding * 2)
  const contentWidth = windowWidth - (spacing.xxl * 2);

  // ... rest of the file ...
```

**Note:** Ensure `useTheme` is imported from `../theme`. If `useTheme` doesn't return `spacing` directly (it usually returns `{ colors, spacing, ... }`), check the `useTheme` definition. Based on other files (e.g. `Home.tsx`), `useTheme` is used to get `colors`. `makeStyles` is used for styles.

**Alternative if `useTheme` doesn't expose `spacing` directly:**
If `useTheme` only exposes `colors` and `dark`, you might need to import `spacing` from a constants file or similar, OR rely on `useStyles` if you can somehow extract it.
*Checking `PostItem.tsx`:* `const useStyles = makeStyles(({ colors, fontSizes, shadow, spacing }) => ({ ...`
It seems `makeStyles` provides it.
*Checking `src/theme/index.ts` (inferred)*: standard usage often allows `const theme = useTheme(); theme.spacing`.

Let's assume `useTheme()` returns the full theme object including `spacing`.

**Step-by-Step:**

1.  **Import `useTheme`**:
    ```typescript
    import { makeStyles, useTheme } from '../theme';
    ```

2.  **Update Component Body**:
    ```typescript
    export function ImageCarousel({ images, onImagePress, serverDimensions }: Props) {
      const styles = useStyles();
      const { spacing } = useTheme(); // Destructure spacing
      const { width: windowWidth } = useWindowDimensions();
      // ...
      
      // 1. Calculate Width
      const contentWidth = windowWidth - (spacing.xxl * 2);
      
      // Remove the old 'const paddingHorizontal = ...' block completely.
    ```

3.  **Update `carouselHeight` calculation** (ensure it uses the new `contentWidth` variable, which it already does).

## Verification
-   The TypeScript error regarding `styles.container.paddingHorizontal` should disappear.
-   The carousel should still snap to pages correctly (1 page per image).
-   The carousel width should align perfectly with the text content of the post (which is also inset by `spacing.xxl`).