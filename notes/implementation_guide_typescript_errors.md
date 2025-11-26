# Step-by-Step Implementation Guide: TypeScript Errors Fix

This guide provides exact code changes to fix all TypeScript errors identified in the `yarn test` output.

---

## PHASE 1: Quick Wins (30 minutes)

### Step 1.1: Fix Missing Hook Exports
**File:** `src/api/hooks/index.ts`

**Current Code (lines 1-7):**
```typescript
export * from './useAnimated';
export * from './useAuth';
export * from './useChatChannelDetail';
export * from './useChatChannelMessages';
export * from './useChatChannelNotifications';
export * from './useCreatePost';
export * from './useCreateThread';
```

**Action:** DELETE the entire file or replace with:
```typescript
// This file is deprecated. All hooks have been moved to src/hooks/
// Import from src/hooks instead
export {};
```

**Reason:** These hooks don't exist in `src/api/hooks/`. They're in `src/hooks/rest/` subdirectories.

---

### Step 1.2: Fix Chat Mock Upload Data
**File:** `e2e/rest-mock/data/chat.ts`

**Current Code (lines 24-28):**
```typescript
uploads: [
  {
    id: 110,
  },
],
```

**Replace with:**
```typescript
uploads: [
  {
    id: 110,
    url: 'https://example.com/upload/110.jpg',
  },
],
```

---

### Step 1.3: Remove numberOfLines Prop
**File:** `src/components/PostItem/HomePostItem.tsx`

**Current Code (line 106):**
```typescript
numberOfLines={5}
```

**Action:** DELETE this line entirely.

---

### Step 1.4: Fix Timer Type
**File:** `src/components/RequestError.tsx`

**Current Code (line 43):**
```typescript
let networkCheckIntervalId: NodeJS.Timer | undefined;
```

**Replace with:**
```typescript
let networkCheckIntervalId: ReturnType<typeof setInterval> | undefined;
```

---

### Step 1.5: Fix HeaderItem isLoading Prop
**File:** `src/screens/PostReply.tsx`

**Current Code (line 428):**
```typescript
isLoading={localImages.some((image) => image.isUploading)}
```

**Replace with:**
```typescript
loading={localImages.some((image) => image.isUploading)}
```

---

## PHASE 2: Type Safety Improvements (1-2 hours)

### Step 2.1: Fix SearchPostItem Undefined Types
**File:** `src/components/PostItem/SearchPostItem.tsx`

Find the section where props are passed to `PostItem` (around lines 78-84). Replace:

```typescript
title={post.title}
content={post.excerpt}
username={post.username}
avatar={getImage(post.avatar)}
tags={post.tags}
createdAt={post.createdAt}
channel={channel}
```

With:

```typescript
title={post.title ?? ''}
content={post.excerpt ?? ''}
username={post.username ?? 'Unknown'}
avatar={getImage(post.avatar ?? '')}
tags={post.tags?.filter((tag): tag is string => tag !== undefined) ?? []}
createdAt={post.createdAt ?? ''}
channel={channel}
```

---

### Step 2.2: Fix UserInformationPostItem Undefined Types
**File:** `src/components/PostItem/UserInformationPostItem.tsx`

Find the section around lines 67-80 and add null coalescing:

```typescript
avatar={getImage(user.avatar ?? '')}
username={user.username ?? 'Unknown'}
createdAt={post.createdAt ?? ''}
content={post.content ?? ''}
title={post.title ?? ''}
```

---

### Step 2.3: Fix transformTopicToPost Image Dimensions
**File:** `src/helpers/transformTopicToPost.ts`

**Current Code (lines 93-100):**
```typescript
imageDimensions:
  imageUrl && typeof imageUrl === 'object' && imageUrl.width
    ? {
        width: imageUrl.width,
        height: imageUrl.height,
        aspectRatio: imageUrl.aspectRatio,
      }
    : undefined,
```

**Replace with:**
```typescript
imageDimensions:
  imageUrl && typeof imageUrl === 'object' && imageUrl.width && imageUrl.height
    ? {
        width: imageUrl.width,
        height: imageUrl.height,
        aspectRatio: imageUrl.aspectRatio ?? imageUrl.width / imageUrl.height,
      }
    : undefined,
```

---

### Step 2.4: Fix Avatar Component Types
**File:** `src/core-ui/Avatar/index.tsx`

**For line 78 (style prop):**

Find where `Image` component is used and change the style prop from `ViewStyle` to `ImageStyle`. Look for the style definition and ensure it uses `ImageStyle` type:

```typescript
const imageStyle: ImageStyle = {
  width: size,
  height: size,
  borderRadius: size / 2,
};
```

**For line 80 (onError handler):**

Find the `onError` prop and update:

```typescript
onError={(event) => {
  // event is now ImageErrorEventData, not the full synthetic event
  setHasError(true);
}}
```

---

### Step 2.5: Fix CachedImage Component
**File:** `src/core-ui/CachedImage.tsx`

**For line 29 (uri property check):**

```typescript
// Before checking source.uri, ensure source is an object with uri property
const sourceUri = typeof source === 'object' && 'uri' in source ? source.uri : undefined;
```

**For line 62 (ImageSource type):**

Add type guard and null checks:

```typescript
const imageSource: ImageSourcePropType = {
  uri: cachedUri,
  ...(dimensions.width && dimensions.height ? {
    width: dimensions.width,
    height: dimensions.height,
  } : {}),
};
```

**For lines 74 & 107 (function calls expecting arguments):**

Find these function calls and add required arguments or check the function signature.

**For line 86 (onError type):**

```typescript
onError={(event) => {
  // Handle the error event properly
  onError?.(event);
}}
```

---

### Step 2.6: Fix ImageSkeleton Dimension Types
**File:** `src/core-ui/ImageSkeleton.tsx`

**Line 37:**

Ensure width and height are proper `DimensionValue` types:

```typescript
style={{
  width: typeof width === 'number' ? width : width,
  height: typeof height === 'number' ? height : height,
}}
```

Or if width/height can be strings, ensure they're percentage strings:

```typescript
style={{
  width: width as DimensionValue,
  height: height as DimensionValue,
}}
```

---

## PHASE 3: Complex Refactoring (2-3 hours)

### Step 3.1: Fix PostDetailHeaderItem Partial Types
**File:** `src/components/PostItem/PostDetailHeaderItem.tsx`

**Lines 91 & 94:**

Add type guards before passing to components:

```typescript
// Line 91
const completeTopic = topic && 'id' in topic && typeof topic.id === 'number' 
  ? topic as TopicFragment 
  : undefined;

// Line 94
const completePost = post && 'id' in post && typeof post.id === 'number'
  ? post as PostFragment
  : undefined;

// Then use completeTopic and completePost instead
```

---

### Step 3.2: Fix HomePostItem transformTopicToPost Call
**File:** `src/components/PostItem/HomePostItem.tsx`

**Line 48:**

Add type guard before calling transformTopicToPost:

```typescript
const postData = useMemo(() => {
  // Ensure cacheTopic has all required non-undefined properties
  if (!cacheTopic || typeof cacheTopic.id !== 'number') {
    return undefined;
  }
  
  // Type assertion after validation
  return transformTopicToPost({ 
    ...cacheTopic as TopicFragment, 
    channels: channelsData ?? [] 
  });
}, [cacheTopic, channelsData]);
```

---

### Step 3.3: Fix useChatChannelNotifications
**File:** `src/hooks/rest/chat/useChatChannelNotifications.ts`

This file is trying to use GraphQL types for REST operations. Two options:

**Option A: Convert to REST-only (Recommended)**

Remove GraphQL type constraints and use plain types:

```typescript
// Remove GraphQL imports and type constraints
// Use plain fetch or axios for REST calls
```

**Option B: Add to GraphQL Schema**

Add these operations to your GraphQL schema if they should be GraphQL operations.

---

### Step 3.4: Fix Navigation Type Errors

#### File: `src/helpers/bottomMenu.ts` (line 64)

Find where navigation is called and ensure the screen name matches the type:

```typescript
// Ensure BottomMenuNavigationScreens includes 'PostReply', 'NewMessage', 'NewPost'
navigate(screen as BottomMenuNavigationScreens, params);
```

#### File: `src/navigation/NavigationService.tsx` (line 20)

Add proper type assertion or fix the navigation call:

```typescript
navigationRef.current?.navigate(screen as any, params as any);
```

Or better, fix the type definitions to match actual usage.

#### File: `src/screens/NewPoll.tsx` (line 325)

Fix the goBack call:

```typescript
navigation.goBack();
```

Instead of:

```typescript
navigation.navigate([screenName]);
```

---

### Step 3.5: Fix NewMessage Upload and Error Handling

**File:** `src/screens/NewMessage.tsx`

**Line 190 (useStatefulUpload):**

Check the hook signature and fix the call. It seems the hook might have changed. Look at the hook definition and match the parameters.

**Line 315 (navigate call):**

```typescript
navigate(screen, params);
```

Ensure types match the navigation definition.

**Line 448 (error handling):**

```typescript
errorHandlerAlert(error.message);
```

Or:

```typescript
errorHandlerAlert(error as ApolloError);
```

**Line 652 (Image component):**

This is using the wrong `Image` import. Ensure you're using React Native's Image:

```typescript
import { Image } from 'react-native';
```

Not the DOM Image.

---

### Step 3.6: Fix PostReply Errors

**File:** `src/screens/PostReply.tsx`

**Line 242 (navigate):**

Same as NewMessage line 315.

**Line 366 (error handling):**

```typescript
errorHandlerAlert(error.message);
```

**Lines 376 & 388 (boolean to number):**

Find these lines and check what's being assigned. Likely a prop that expects a number but receives a boolean. Fix the assignment:

```typescript
// If it's a count or index, use proper number
value={someBoolean ? 1 : 0}
```

**Line 428 (isLoading to loading):**

Already covered in Phase 1, Step 1.5.

---

### Step 3.7: Fix ThreadDetailsHeader

**File:** `src/screens/Chat/components/ThreadDetailsHeader.tsx`

**Line 45:**

```typescript
username={safeMessage?.user?.username ?? 'Unknown'}
```

**Line 53:**

Add type assertion after validation:

```typescript
const completeMessage = safeMessage && 'id' in safeMessage && typeof safeMessage.id === 'number'
  ? safeMessage as ChatMessageContent
  : undefined;
```

**Line 54:**

```typescript
user={safeMessage?.user as User}
```

Or add proper validation:

```typescript
user={safeMessage?.user ?? { id: 0, username: 'Unknown', avatar: '' }}
```

---

## PHASE 4: Verification

### Step 4.1: Run Tests

```bash
yarn test
```

### Step 4.2: Regenerate GraphQL Types

```bash
yarn graphql:generate
```

### Step 4.3: Check for Remaining Errors

Review the output and address any remaining issues.

---

## Notes

- Some errors may be interdependent. Fix them in the order presented.
- After each phase, commit your changes.
- Test the affected screens manually if possible.
- Some fixes may require adjusting type definitions in `src/types/`.

## Priority Order

If time is limited, fix in this order:
1. Phase 1 (all steps) - Critical, prevents build
2. Step 2.3 (transformTopicToPost) - High impact
3. Steps 2.1 & 2.2 (undefined types) - Prevents runtime errors
4. Step 3.5 & 3.6 (NewMessage & PostReply) - User-facing screens
5. Remaining steps - Nice to have

