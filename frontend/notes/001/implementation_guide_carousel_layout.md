# Implementation Guide: Control ImageCarousel Height

## Goal
Restrict the maximum height of the `ImageCarousel` so that images do not become excessively tall. The goal is to render the image's natural height unless it exceeds a height-to-width ratio of 1.5.

## File Location
`src/components/ImageCarousel.tsx`

## Current Logic
The current logic calculates the height based on the aspect ratio derived from `serverDimensions` (or defaults to 16:9). It allows the height to grow indefinitely if the aspect ratio is small (i.e., for tall images).

```typescript
// Lines 36-40 in src/components/ImageCarousel.tsx
const carouselHeight = Math.max(contentWidth / aspectRatio, 200);
```

## Proposed Change

We need to clamp the calculated height so it doesn't exceed `contentWidth * 1.5`.

1.  **Calculate Natural Height:** Determine the height the image *wants* to be based on its aspect ratio.
2.  **Define Max Height:** Calculate the maximum allowed height (`contentWidth * 1.5`).
3.  **Apply Limit:** Use the smaller of the two values (but keep the safety minimum of 200px).

### Code Snippet

Replace the existing height calculation logic (around lines 28-40) with:

```typescript
  // 2. Calculate Height
  // Use server dimensions if available, otherwise default to 16:9 (1.77)
  let aspectRatio = 1.77;
  if (serverDimensions) {
    if (serverDimensions.aspectRatio) {
      aspectRatio = serverDimensions.aspectRatio;
    } else if (serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
    }
  }
  
  // Calculate the natural height based on width and aspect ratio
  const naturalHeight = contentWidth / aspectRatio;

  // Define the maximum allowed height ratio (e.g., 1.5 means height can be 1.5x the width)
  const MAX_HEIGHT_RATIO = 5;
  const maxHeight = contentWidth * MAX_HEIGHT_RATIO;

  // Use the natural height, but cap it at maxHeight. 
  // Also keep a safety minimum of 200 to prevent collapse.
  const carouselHeight = Math.max(Math.min(naturalHeight, maxHeight), 200);
```

## Next Steps
1.  Open `src/components/ImageCarousel.tsx`.
2.  Apply the code change above.
3.  Verify that tall images are now constrained to the 1.5 ratio, while landscape/square images still render at their natural aspect ratio.