# Plan: Fix VirtualizedList Performance Warning

## Error Analysis

### The Warning
```
LOG  VirtualizedList: You have a large list that is slow to update - make sure your renderItem function renders components that follow React performance best practices like PureComponent, shouldComponentUpdate, etc. 
{"contentLength": 6988.6669921875, "dt": 1856, "prevDt": 32816}
```

### What This Means
- **contentLength**: ~7000 pixels of content
- **dt**: Current update took 1856ms (~1.9 seconds) 
- **prevDt**: Previous update took 32816ms (~33 seconds!)
- **Problem**: The list is taking too long to re-render when data changes

### Root Cause
The warning indicates that the `renderItem` function in the Home screen's PostList is causing expensive re-renders. Each time the list updates (scroll, data refresh, etc.), React is re-rendering components unnecessarily.

## Investigation Summary

### Component Hierarchy
```
Home.tsx
  └─ PostList (FlatList wrapper)
      └─ renderItem={(item) => <HomePostItem />}
          └─ HomePostItem (React.memo with custom areEqual)
              └─ PostItem (React.memo with custom areEqual)
                  ├─ Author (NOT memoized)
                  ├─ PostGroupings (need to check)
                  ├─ MarkdownRenderer (React.memo ✓)
                  ├─ ImageCarousel (NOT memoized)
                  ├─ PollPreview (need to check)
                  └─ PostItemFooter (NOT memoized)
                      ├─ Metrics (wrapper, NOT memoized)
                      │   └─ MetricsView (React.memo ✓)
                      └─ AvatarRow (NOT memoized)
```

### Current Optimizations ✓
1. **HomePostItem**: Uses `React.memo` with custom `areEqual` comparison
2. **PostItem**: Uses `React.memo` with custom `areEqual` comparison  
3. **MarkdownRenderer**: Uses `React.memo`
4. **MetricsView**: Uses `React.memo`
5. **PostList**: Has optimized FlatList props:
   - `initialNumToRender={5}`
   - `maxToRenderPerBatch={7}`
   - `windowSize={10}`

### Missing Optimizations ✗

1. **Author Component** - NOT memoized
   - Rendered in every PostItem
   - Contains TouchableOpacity with inline callbacks
   - Re-renders on every parent update

2. **ImageCarousel** - NOT memoized
   - Complex component with ScrollView
   - Uses `useMemo` internally but component itself not memoized
   - Re-renders even when images haven't changed

3. **PostItemFooter** - NOT memoized
   - Wrapper component that always re-renders
   - Contains Metrics and AvatarRow

4. **AvatarRow** - NOT memoized
   - Maps over posters array
   - Creates Avatar components dynamically

5. **Metrics** - NOT memoized (wrapper)
   - The wrapper `Metrics` component is not memoized
   - Only `MetricsView` (child) is memoized

6. **PostGroupings** - Need to check if memoized

7. **PollPreview** - Need to check if memoized

### Additional Issues

#### 1. Inline Function in Home.tsx renderItem
```tsx
renderItem={({ item }) => {
  return (
    <HomePostItem
      topicId={item.topicId}
      prevScreen={'Home'}
      onPressReply={onPressReply}
      style={isTablet ? styles.postItemCardTablet : undefined}
    />
  );
}}
```
- Creates new function on every render
- `onPressReply` is stable (useCallback) ✓
- `style` prop changes based on `isTablet` (stable) ✓
- Could be extracted to a separate component

#### 2. PostItem areEqual Comparison Issues
```tsx
const areEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.topicId === nextProps.topicId &&
    prevProps.title === nextProps.title &&
    prevProps.content === nextProps.content &&
    prevProps.username === nextProps.username &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.hidden === nextProps.hidden &&
    prevProps.isHidden === nextProps.isHidden &&
    prevProps.prevScreen === nextProps.prevScreen &&
    prevProps.pinned === nextProps.pinned &&
    prevProps.tags?.length === nextProps.tags?.length &&
    prevProps.polls?.length === nextProps.polls?.length
  );
};
```

**Problems:**
- Doesn't check `footer` prop (which is a ReactNode that changes)
- Doesn't check `images` array
- Doesn't check `channel` object
- Doesn't check `avatar`, `createdAt`
- Only checks array lengths, not contents

#### 3. HomePostItem Passes Inline JSX as footer Prop
```tsx
<PostItem
  // ... other props
  footer={
    <PostItemFooter
      topicId={topicId}
      postList
      viewCount={viewCount}
      likeCount={likeCount}
      replyCount={replyCount}
      isLiked={isLiked}
      isCreator={isCreator}
      postNumber={postNumber}
      frequentPosters={freqPosters.slice(1)}  // ⚠️ Creates new array every render
      likePerformedFrom={'home-scene'}
      onPressReply={onPressReply}
      onPressView={onPressPost}
      style={styles.spacingTop}
    />
  }
/>
```

**Problems:**
- `footer` is created as new JSX on every render
- `freqPosters.slice(1)` creates new array every time
- Even if PostItem's `areEqual` returns true, the footer prop is a new object reference

## Proposed Solution

### Phase 1: Memoize Child Components (High Impact)

#### 1.1 Memoize Author Component
**File**: `components/Author.tsx`

**Change**:
```tsx
// At the bottom of the file, change:
export function Author(props: Props) { ... }

// To:
function BaseAuthor(props: Props) { ... }
export const Author = React.memo(BaseAuthor);
```

**Impact**: Prevents Author from re-rendering when parent updates

#### 1.2 Memoize ImageCarousel Component
**File**: `components/ImageCarousel.tsx`

**Change**:
```tsx
// At the bottom, change:
export function ImageCarousel({ ... }: Props) { ... }

// To:
function BaseImageCarousel({ ... }: Props) { ... }
export const ImageCarousel = React.memo(BaseImageCarousel);
```

**Impact**: Prevents expensive image carousel re-renders

#### 1.3 Memoize PostItemFooter Component
**File**: `components/PostItem/PostItemFooter.tsx`

**Change**:
```tsx
// At the bottom, change:
export function PostItemFooter(props: Props) { ... }

// To:
function BasePostItemFooter(props: Props) { ... }
export const PostItemFooter = React.memo(BasePostItemFooter);
```

**Impact**: Prevents footer re-renders

#### 1.4 Memoize AvatarRow Component
**File**: `components/AvatarRow.tsx`

**Change**:
```tsx
// At the bottom, change:
export function AvatarRow(props: Props) { ... }

// To:
function BaseAvatarRow(props: Props) { ... }
export const AvatarRow = React.memo(BaseAvatarRow);
```

**Impact**: Prevents avatar row re-renders

#### 1.5 Memoize Metrics Wrapper Component
**File**: `components/Metrics/Metrics.tsx`

**Change**:
```tsx
// Change the export:
export function Metrics(props: Props) { ... }

// To:
function BaseMetrics(props: Props) { ... }
export const Metrics = React.memo(BaseMetrics);
```

**Impact**: Prevents Metrics wrapper from re-rendering

### Phase 2: Fix Reference Equality Issues (Critical)

#### 2.1 Fix freqPosters.slice(1) in HomePostItem
**File**: `components/PostItem/HomePostItem.tsx`

**Current**:
```tsx
<PostItemFooter
  frequentPosters={freqPosters.slice(1)}  // ⚠️ New array every render
  // ...
/>
```

**Fix**:
```tsx
// Add useMemo before the return statement:
const slicedFreqPosters = useMemo(
  () => freqPosters.slice(1),
  [freqPosters]
);

// Then use it:
<PostItemFooter
  frequentPosters={slicedFreqPosters}
  // ...
/>
```

**Impact**: Prevents new array creation on every render

#### 2.2 Improve PostItem areEqual Comparison
**File**: `components/PostItem/PostItem.tsx`

**Current**: Only checks some props, misses important ones

**Fix**: Add comprehensive comparison
```tsx
const areEqual = (prevProps: Props, nextProps: Props) => {
  // Basic props
  if (
    prevProps.topicId !== nextProps.topicId ||
    prevProps.title !== nextProps.title ||
    prevProps.content !== nextProps.content ||
    prevProps.username !== nextProps.username ||
    prevProps.isLiked !== nextProps.isLiked ||
    prevProps.hidden !== nextProps.hidden ||
    prevProps.isHidden !== nextProps.isHidden ||
    prevProps.prevScreen !== nextProps.prevScreen ||
    prevProps.pinned !== nextProps.pinned ||
    prevProps.avatar !== nextProps.avatar ||
    prevProps.createdAt !== nextProps.createdAt
  ) {
    return false;
  }

  // Arrays - check length and reference
  if (prevProps.tags?.length !== nextProps.tags?.length) return false;
  if (prevProps.polls?.length !== nextProps.polls?.length) return false;
  if (prevProps.images?.length !== nextProps.images?.length) return false;
  
  // For images, do a shallow comparison if lengths match
  if (prevProps.images && nextProps.images) {
    for (let i = 0; i < prevProps.images.length; i++) {
      if (prevProps.images[i] !== nextProps.images[i]) return false;
    }
  }

  // Channel object - check id which is the key identifier
  if (prevProps.channel?.id !== nextProps.channel?.id) return false;

  // Footer is tricky - it's a ReactNode. We can't easily compare it.
  // Since footer is created in HomePostItem with stable props (after our fixes),
  // we'll rely on the other props to determine equality.
  // Alternatively, we could pass footer props separately and create it in PostItem.

  return true;
};
```

**Impact**: More accurate memoization, prevents unnecessary re-renders

### Phase 3: Optimize Callback Stability (Medium Impact)

#### 3.1 Extract renderItem to Stable Component
**File**: `screens/Home/Home.tsx`

**Current**:
```tsx
renderItem={({ item }) => {
  return (
    <HomePostItem
      topicId={item.topicId}
      prevScreen={'Home'}
      onPressReply={onPressReply}
      style={isTablet ? styles.postItemCardTablet : undefined}
    />
  );
}}
```

**Option A - useCallback**:
```tsx
const renderItem = useCallback(
  ({ item }: { item: PostWithoutId }) => (
    <HomePostItem
      topicId={item.topicId}
      prevScreen={'Home'}
      onPressReply={onPressReply}
      style={isTablet ? styles.postItemCardTablet : undefined}
    />
  ),
  [onPressReply, isTablet, styles.postItemCardTablet]
);

// Then use:
<PostList
  renderItem={renderItem}
  // ...
/>
```

**Option B - Separate Component** (Better):
```tsx
// Create a new component
type RenderItemProps = {
  item: PostWithoutId;
  onPressReply: (params: { topicId: number }) => void;
  isTablet: boolean;
  style?: any;
};

const HomePostItemRenderer = React.memo(({ item, onPressReply, isTablet, style }: RenderItemProps) => (
  <HomePostItem
    topicId={item.topicId}
    prevScreen={'Home'}
    onPressReply={onPressReply}
    style={style}
  />
));

// Then in Home component:
const renderItem = useCallback(
  ({ item }: { item: PostWithoutId }) => (
    <HomePostItemRenderer
      item={item}
      onPressReply={onPressReply}
      isTablet={isTablet}
      style={isTablet ? styles.postItemCardTablet : undefined}
    />
  ),
  [onPressReply, isTablet, styles.postItemCardTablet]
);
```

**Impact**: Prevents renderItem function recreation

### Phase 4: Additional Optimizations (Lower Priority)

#### 4.1 Check and Memoize PostGroupings
Need to verify if this component is memoized

#### 4.2 Check and Memoize PollPreview
Need to verify if this component is memoized

#### 4.3 Consider getItemLayout for FlatList
**File**: `components/PostList.tsx`

If post items have consistent height, we can add `getItemLayout`:
```tsx
const getItemLayout = (data: any, index: number) => ({
  length: ITEM_HEIGHT, // Need to determine average height
  offset: ITEM_HEIGHT * index,
  index,
});
```

**Impact**: Improves scroll performance, but requires fixed/estimated heights

#### 4.4 Add removeClippedSubviews
**File**: `components/PostList.tsx`

```tsx
<Animated.FlatList<T>
  removeClippedSubviews={true}  // Add this
  // ... other props
/>
```

**Impact**: Unmounts off-screen components (Android only, iOS automatic)

## Implementation Priority

### 🔴 Critical (Do First)
1. ✅ Memoize Author component
2. ✅ Memoize PostItemFooter component
3. ✅ Memoize AvatarRow component
4. ✅ Fix `freqPosters.slice(1)` with useMemo
5. ✅ Memoize Metrics wrapper component

### 🟡 High Priority (Do Second)
6. ✅ Memoize ImageCarousel component
7. ✅ Improve PostItem areEqual comparison
8. ✅ Extract renderItem to useCallback or separate component

### 🟢 Medium Priority (Do Third)
9. ⚠️ Check and memoize PostGroupings if needed
10. ⚠️ Check and memoize PollPreview if needed
11. ⚠️ Consider adding removeClippedSubviews

### ⚪ Low Priority (Optional)
12. ⚠️ Consider getItemLayout if heights are consistent
13. ⚠️ Profile with React DevTools Profiler to measure improvements

## Expected Impact

### Before Optimizations
- Update time: 1856ms - 32816ms
- Every scroll/update causes full re-render of all visible items
- Child components re-render unnecessarily

### After Optimizations
- Expected update time: <500ms
- Only changed items re-render
- Child components skip re-renders when props haven't changed
- Smoother scrolling experience

## Testing Plan

### 1. Measure Baseline
```tsx
// Add to Home.tsx temporarily
console.time('HomeRender');
// ... in component
console.timeEnd('HomeRender');
```

### 2. Apply Optimizations Incrementally
- Apply Phase 1 → Test → Measure
- Apply Phase 2 → Test → Measure  
- Apply Phase 3 → Test → Measure

### 3. Test Scenarios
- [ ] Scroll through long list (50+ posts)
- [ ] Pull to refresh
- [ ] Switch between Latest/Top tabs
- [ ] Like/unlike posts
- [ ] Navigate away and back
- [ ] Load more posts (pagination)

### 4. Verify No Regressions
- [ ] All interactions still work
- [ ] No visual glitches
- [ ] No console errors
- [ ] Data updates correctly

## Files to Modify

1. [`components/Author.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/Author.tsx) - Add React.memo
2. [`components/ImageCarousel.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/ImageCarousel.tsx) - Add React.memo
3. [`components/PostItem/PostItemFooter.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/PostItemFooter.tsx) - Add React.memo
4. [`components/AvatarRow.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/AvatarRow.tsx) - Add React.memo
5. [`components/Metrics/Metrics.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/Metrics/Metrics.tsx) - Add React.memo to wrapper
6. [`components/PostItem/HomePostItem.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/HomePostItem.tsx) - Fix freqPosters.slice(1)
7. [`components/PostItem/PostItem.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/components/PostItem/PostItem.tsx) - Improve areEqual
8. [`screens/Home/Home.tsx`](file:///Users/emil/Documents/Taenketanken/discourse/lexicon/frontend/src/screens/Home/Home.tsx) - Extract renderItem

## Potential Risks

1. **Over-memoization**: Too much memoization can actually hurt performance
   - **Mitigation**: Only memoize components that are expensive or render frequently

2. **Stale closures**: Memoized components might capture old values
   - **Mitigation**: Carefully manage dependencies in useMemo/useCallback

3. **Breaking changes**: Changing component signatures
   - **Mitigation**: Keep exports the same, only change internals

4. **Regression**: Functionality might break
   - **Mitigation**: Thorough testing after each change

## Success Criteria

✅ VirtualizedList warning no longer appears  
✅ Update times consistently < 500ms  
✅ Smooth scrolling with no jank  
✅ All features continue to work correctly  
✅ No new console warnings or errors

---

**Ready for implementation!** This plan provides a systematic approach to fixing the performance issue.
