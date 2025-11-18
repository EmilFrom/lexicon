# Plan: Fix Image Carousel Content Invisibility

## 1. Analysis

The logs are extremely helpful:
1.  `[PostDetailHeaderItem] Rendering:` -> Images are present (count: 2), URL is valid.
2.  `[ImageCarousel] Layout:` -> `contentWidth` is **392**. `imagesCount` is **1** or **2**.
3.  **Key Finding:** `contentWidth` is positive, `windowWidth` is 440. This means the layout calculation is **CORRECT**.

**So why is it invisible?**
If the width and height are correct, and the image source is valid, the only remaining explanation is that the **image container or the ScrollView itself has zero height or is being clipped.**

Looking at `ImageCarousel.tsx`:
```typescript
<View style={styles.container}>
  <ScrollView ... style={[styles.scrollView, { width: contentWidth }]}>
     {images.map(... => (
        <View style={[styles.imageContainer, { width: contentWidth }]}>
           <AuthenticatedImage ... />
```

And `AuthenticatedImage.tsx`:
```typescript
const imageContent = (
    <View style={[styles.imageContainer, { height: imageHeight }, style]} testID={testID}>
```

**Hypothesis:**
The `ScrollView` in `ImageCarousel` **does not have a height**.
*   Vertical ScrollViews grow with content.
*   Horizontal ScrollViews with `flex: 1` children need an explicit height on the ScrollView itself or its container, otherwise they might collapse to height 0 if the parent (`PostItem`) doesn't enforce one.
*   `AuthenticatedImage` has a height, but it's inside a `View` inside the `ScrollView`. If the `ScrollView` doesn't "see" that height, it might collapse.

Wait, `AuthenticatedImage` has an explicit height set via props. That `View` should force the `ScrollView` content container to expand.

**Wait, look at `ImageCarousel.tsx` styles:**
```typescript
  scrollView: {
    borderRadius: spacing.m,
  },
```
It has NO height.

In `PostItem.tsx`, `ImageCarousel` is rendered directly.

**The Layout Issue:**
In React Native, a horizontal ScrollView needs to know its height. The children (`AuthenticatedImage`) have height, so the content container *should* grow.

**However**, let's look at the logs again. `contentWidth` is 392. `windowWidth` is 440.
`AuthenticatedImage` calculates height based on `screenWidth / aspectRatio`.
If `aspectRatio` defaults to ~1.77, height is ~248.

**The Real Issue:**
The `ImageCarousel` component wraps the `ScrollView` in a `View style={styles.container}`.
The `ScrollView` has `style={[styles.scrollView, { width: contentWidth }]}`.
The `AuthenticatedImage` is inside.

**Suspicion:**
The `ScrollView` style might need `flexGrow: 0` or the container needs to wrap the content tightly.

**Let's try a brute force fix:**
Pass the calculated height from `AuthenticatedImage` UP to `ImageCarousel` or calculate it in `ImageCarousel` and apply it to the `ScrollView`.

**Actually, simpler:**
`AuthenticatedImage` sets the height on *its* container.
But `ImageCarousel` iterates:
```typescript
<View key={index} style={[styles.imageContainer, { width: contentWidth }]}>
   <AuthenticatedImage ... />
</View>
```
The wrapper `View` (`styles.imageContainer`) in `ImageCarousel` does **NOT** have a height set. It relies on the child `AuthenticatedImage` to push it open. This *should* work.

**BUT**, `styles.imageContainer` has `overflow: 'hidden'`.
If `AuthenticatedImage`'s height calculation relies on `onLayout` or something async, it might be 0 initially. But we added a fallback height of 300!

**Let's look at `PostItem` again.**
`ImageCarousel` is rendered *after* `mainContent`.
```typescript
      <TouchableOpacity onPress={onPressPost} delayPressIn={200}>
        {mainContent}
      </TouchableOpacity>
      {pollsContent}
      {imageContent} <--- Here
```

**Is it possible `serverDimensions` is messing it up?**
In `AuthenticatedImage`:
```typescript
    if (serverDimensions && serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
```
The log says: `Rendering: {"firstImage": "...", "imagesCount": 2, "topicId": 49}`.
It does *not* show `serverDimensions`. If `PostDetailHeaderItem` passes `serverDimensions` as `undefined`, `AuthenticatedImage` falls back to 1.77.

**Wait!**
I see `imageDimensions` passed to `PostItem`.
```typescript
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
```
And `PostDetailHeaderItem` passes it?
**No!** `PostDetailHeaderItem` does **NOT** seem to calculate or pass `imageDimensions` to `PostItem`.
In `PostDetailHeaderItem.tsx`:
```typescript
    <PostItem
      topicId={topicId}
      // ...
      images={images}
      // imageDimensions is MISSING!
```

If `imageDimensions` is undefined, `ImageCarousel` receives undefined `serverDimensions`.
`AuthenticatedImage` receives undefined `serverDimensions`.
It uses `screenWidth` (440) / 1.77 = ~248 height.

**Why is it invisible?**

Let's force the height on the **ScrollView** in `ImageCarousel`.
We can pass `maxHeightRatio` logic to `ImageCarousel` or just calculate a "carousel height" there.

**New Strategy:**
The safest way to ensure a Carousel renders is to give the `ScrollView` an explicit `height`.
Since all images in the carousel should ideally be the same height (or the container fits the tallest), we should calculate the height in `ImageCarousel`.

**Proposed Fix:**
1.  In `ImageCarousel`, calculate the expected height (using the default aspect ratio or `serverDimensions`).
2.  Apply that `height` to the `ScrollView` style or the wrapper `View`.

**Let's refine `ImageCarousel.tsx`:**
```typescript
  // ...
  const height = contentWidth / (serverDimensions?.aspectRatio || 1.77);
  // ...
  <View style={[styles.container, { height }]}> 
      <ScrollView style={{ height }} ...>
```

This forces the space to be reserved.

## 2. Plan

**File:** `src/components/ImageCarousel.tsx`

**Action:**
1.  Calculate `carouselHeight` based on `contentWidth` and aspect ratio (default 1.77 or from `serverDimensions`).
2.  Apply this `carouselHeight` to the container `View` and the `ScrollView`.
3.  Pass `height: '100%'` to `AuthenticatedImage` to ensure it fills that space.

**Wait**, `AuthenticatedImage` calculates its *own* height. If we force height on the parent, we should tell `AuthenticatedImage` to just fill it.
`AuthenticatedImage` accepts `style`. We can pass `{ height: '100%' }`.

**Revised Plan:**
1.  Modify `ImageCarousel` to calculate the container height.
2.  Modify `ImageCarousel` to pass `style={{ height: '100%' }}` to `AuthenticatedImage`.
3.  Modify `AuthenticatedImage` to respect `style` height over its internal calculation *if provided* (it already does via style prop merging, but let's verify).

**Actually**, `AuthenticatedImage` does this:
```typescript
const imageContent = (
    <View style={[styles.imageContainer, { height: imageHeight }, style]} testID={testID}>
```
It overwrites `height` with `imageHeight`.
If we pass `style={{ height: '100%' }}`, the `imageHeight` calculation (which might be failing or different) usually takes precedence if it's inline style vs prop style, but here `imageHeight` is inline.

**Better approach for `AuthenticatedImage`:**
If `height` is passed in `style`, use it? No, that's complex to detect.

**Simplest Fix:**
Just ensure `ImageCarousel` has a height. If the parent has height, and the child has height, it works. If the parent (ScrollView) has 0 height, the child is clipped.

I will force a minimum height on `ImageCarousel`'s container.

## 3. Implementation Details

**File:** `src/components/ImageCarousel.tsx`

```typescript
// ...
  const aspectRatio = serverDimensions?.aspectRatio || (serverDimensions?.width && serverDimensions?.height ? serverDimensions.width / serverDimensions.height : 1.77);
  const carouselHeight = contentWidth / aspectRatio;
  
  // Safety clamp
  const finalHeight = Math.max(carouselHeight, 200); 

  return (
    <View style={[styles.container, { height: finalHeight }]}>
       <ScrollView style={{ flex: 1 }} ... >
          {/* ... */}
             <View style={{ width: contentWidth, height: '100%' }}>
                <AuthenticatedImage ... style={{ height: '100%' }} />
```

This structure guarantees layout.

## 4. Approval
Proceed?
