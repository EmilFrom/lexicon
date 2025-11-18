# Implementation Guide: Visual Debugging for PostItem

This guide adds visual markers (red/blue backgrounds) and logs to `PostItem` and `ImageCarousel` to pinpoint why images are invisible on the Post Detail screen.

## Step 1: Update `PostItem.tsx`

**File:** `src/components/PostItem/PostItem.tsx`

**Action:** Add debug logs and a background color to the image container.

```typescript
// ... imports

function BasePostItem(props: Props) {
  // ... existing hooks

  const {
    // ... other props
    images: propImages,
    // ...
  } = props;

  // ... existing logic

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const images = propImages ?? (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || []);
  // ...
  
  // DEBUG LOG
  if (__DEV__) {
      console.log('[PostItem] Render:', { 
          hasPropImages: !!propImages, 
          finalImagesCount: images.length,
          firstImage: images[0]
      });
  }

  // ... 

  const imageContent = (
    <View style={{ backgroundColor: 'red', minHeight: images.length ? 20 : 0 }}>
      <ImageCarousel
        images={images}
        onImagePress={(uri) => setFullScreenImage(uri)}
        serverDimensions={imageDimensions}
      />
    </View>
  );
  
  // ... rest of component
```

## Step 2: Update `ImageCarousel.tsx`

**File:** `src/components/ImageCarousel.tsx`

**Action:** Add a blue background to the carousel container to see its layout.

```typescript
// ... imports

export function ImageCarousel({ images, onImagePress, serverDimensions }: Props) {
  // ... calculations
  const carouselHeight = Math.max(contentWidth / aspectRatio, 200);

  // ... 

  return (
    <View style={[styles.container, { height: carouselHeight, backgroundColor: 'blue' }]}>
      <ScrollView
         // ... props
         style={[styles.scrollView, { width: contentWidth, height: carouselHeight, backgroundColor: 'yellow' }]}
         // ...
```

## Step 3: Verify

1.  Restart `yarn start`.
2.  Navigate to Post Detail.
3.  **Look for Colors:**
    *   **Red:** `PostItem` wrapper. If you see this but no blue/yellow, `ImageCarousel` isn't rendering.
    *   **Blue:** `ImageCarousel` container. If you see this, the container has size.
    *   **Yellow:** `ScrollView`. If you see this, the scrollview has size.
4.  **Check Logs:** Confirm `[PostItem] Render` shows a count > 0.
