# Comprehensive TypeScript Errors Fix Plan

## Analysis Summary

After thoroughly analyzing the codebase and the `yarn test` output, I've identified **50+ TypeScript errors** across multiple categories. These errors stem from:

1. **Missing hook files** - Referenced but don't exist
2. **Type mismatches** - GraphQL types vs REST types incompatibility  
3. **Missing required properties** - Objects missing required fields
4. **Type narrowing issues** - `undefined` not properly handled
5. **Navigation type errors** - Screen parameter type mismatches
6. **Timer type conflicts** - Node.js vs React Native timer types
7. **Image type incompatibilities** - React Native Image API changes
8. **Style type mismatches** - ViewStyle vs ImageStyle conflicts

## Error Categories & Fixes

### Category 1: Missing Hook Files (High Priority)
**Files:** `src/api/hooks/index.ts`

**Errors:**
```
src/api/hooks/index.ts(1,15): error TS2307: Cannot find module './useAnimated'
src/api/hooks/index.ts(2,15): error TS2307: Cannot find module './useAuth'
src/api/hooks/index.ts(3,15): error TS2307: Cannot find module './useChatChannelDetail'
src/api/hooks/index.ts(4,15): error TS2307: Cannot find module './useChatChannelMessages'
src/api/hooks/index.ts(6,15): error TS2307: Cannot find module './useCreatePost'
src/api/hooks/index.ts(7,15): error TS2307: Cannot find module './useCreateThread'
```

**Root Cause:** The file `src/api/hooks/index.ts` is exporting hooks that don't exist in that directory. These hooks actually exist in `src/hooks/rest/` subdirectories.

**Fix:** Remove the incorrect exports from `src/api/hooks/index.ts` or update paths to point to correct locations.

---

### Category 2: Chat Upload Type Missing Required Property
**File:** `e2e/rest-mock/data/chat.ts:25`

**Error:**
```
e2e/rest-mock/data/chat.ts(25,7): error TS2741: Property 'url' is missing in type '{ id: number; }' but required in type '{ id: number; url: string; extension?: string | null | undefined; originalFilename?: string | null | undefined; }'.
```

**Root Cause:** The `ChatMessageUpload` type requires a `url` property (line 13 in `src/types/api/chat.ts`), but the mock data only provides `id`.

**Fix:** Add `url` property to the upload object in the mock data:
```typescript
uploads: [
  {
    id: 110,
    url: 'https://example.com/upload/110.jpg', // Add this
  },
],
```

---

### Category 3: GraphQL Notification Hooks Type Errors
**File:** `src/hooks/rest/chat/useChatChannelNotifications.ts`

**Errors:**
```
src/api/hooks/useChatChannelNotifications.ts(44,17): error TS2344: Type '"chatChannelNotificationPreference"' does not satisfy the constraint 'keyof Query'.
src/api/hooks/useChatChannelNotifications.ts(58,20): error TS2344: Type '"updateChatChannelNotificationPreference"' does not satisfy the constraint 'keyof Mutation'.
```

**Root Cause:** These are REST API hooks but they're trying to use GraphQL query/mutation type constraints. The operations don't exist in the GraphQL schema.

**Fix:** This file should use REST API patterns, not GraphQL hooks. Need to refactor to use proper REST hooks or add these operations to the GraphQL schema.

---

### Category 4: PostItem Type Mismatches
**Files:** 
- `src/components/PostItem/HomePostItem.tsx:48, 106`
- `src/components/PostItem/PostDetailHeaderItem.tsx:91, 94`

**Errors:**
```
HomePostItem.tsx(48,30): Argument of type with DeepPartialObject is not assignable to parameter of type 'Params'
HomePostItem.tsx(106,7): Property 'numberOfLines' does not exist on type PostItemProps
PostDetailHeaderItem.tsx(91,5): DeepPartialObject<TopicFragment> is not assignable to TopicFragment
PostDetailHeaderItem.tsx(94,5): DeepPartialObject<PostFragment> is not assignable to PostFragment
```

**Root Cause:** 
1. `transformTopicToPost` expects non-partial types but receives `DeepPartialObject` from Apollo fragments
2. `PostItem` doesn't accept `numberOfLines` prop (it was removed)

**Fixes:**
1. Remove `numberOfLines={5}` from `HomePostItem.tsx:106`
2. Add type guards to ensure complete data before passing to `transformTopicToPost`
3. Handle `DeepPartialObject` types properly in `PostDetailHeaderItem`

---

### Category 5: SearchPostItem Undefined Type Errors
**File:** `src/components/PostItem/SearchPostItem.tsx:78-84`

**Errors:**
```
SearchPostItem.tsx(78,7): Type 'string | undefined' is not assignable to type 'string'
SearchPostItem.tsx(79,7): Type 'string | undefined' is not assignable to type 'string'
... (6 more similar errors)
```

**Root Cause:** Properties from search results can be `undefined`, but they're being passed to components expecting non-undefined strings.

**Fix:** Add null coalescing or default values:
```typescript
title={post.title ?? ''}
content={post.excerpt ?? ''}
username={post.username ?? 'Unknown'}
```

---

### Category 6: UserInformationPostItem Undefined Errors
**File:** `src/components/PostItem/UserInformationPostItem.tsx:67, 73, 75, 79, 80`

**Errors:**
```
UserInformationPostItem.tsx(67,27): Argument of type 'string | undefined' is not assignable to parameter of type 'string'
... (4 more similar errors)
```

**Root Cause:** Same as Category 5 - optional properties not handled.

**Fix:** Add default values for all undefined properties.

---

### Category 7: Timer Type Conflicts
**File:** `src/components/RequestError.tsx:61, 69`

**Errors:**
```
RequestError.tsx(61,25): No overload matches this call for clearInterval
RequestError.tsx(69,23): No overload matches this call for clearInterval
```

**Root Cause:** `NodeJS.Timer` type conflicts with React Native's timer expectations. This is a known TypeScript issue with timer types.

**Fix:** Type cast the timer variable:
```typescript
let networkCheckIntervalId: ReturnType<typeof setInterval> | undefined;
```

---

### Category 8: Avatar Style Type Mismatch
**File:** `src/core-ui/Avatar/index.tsx:78, 80`

**Errors:**
```
Avatar/index.tsx(78,13): Type 'StyleProp<ViewStyle>' is not assignable to ImageStyle
Avatar/index.tsx(80,11): Type '(error: ImageErrorEvent) => void' is not assignable to expected type
```

**Root Cause:** 
1. Passing `ViewStyle` to `Image` component which expects `ImageStyle`
2. `onError` handler signature changed in newer React Native versions

**Fixes:**
1. Create proper `ImageStyle` or use type assertion
2. Update `onError` handler to match new signature

---

### Category 9: CachedImage Type Errors
**File:** `src/core-ui/CachedImage.tsx:29, 62, 74, 86, 107`

**Errors:**
```
CachedImage.tsx(29,32): Property 'uri' does not exist on type 'NonNullable<...>'
CachedImage.tsx(62,9): Type 'ImageSource' is not assignable to type 'ImageSourcePropType'
... (3 more errors)
```

**Root Cause:** React Native Image API type changes - `width` and `height` can be `null` in some contexts.

**Fix:** Add proper type guards and handle null cases for image dimensions.

---

### Category 10: ImageSkeleton Style Type Error
**File:** `src/core-ui/ImageSkeleton.tsx:37`

**Error:**
```
ImageSkeleton.tsx(37,37): Type '{ width: string | number; height: string | number; }' is not assignable to ViewStyle
```

**Root Cause:** `DimensionValue` type doesn't accept all string values.

**Fix:** Ensure width/height are proper `DimensionValue` types (number or percentage string).

---

### Category 11: transformTopicToPost Image Dimensions Type Error
**File:** `src/helpers/transformTopicToPost.ts:93`

**Error:**
```
transformTopicToPost.ts(93,5): Type '{ width: number; height: number | null | undefined; aspectRatio: number | null | undefined; }' is not assignable
```

**Root Cause:** `imageUrl.height` and `imageUrl.aspectRatio` can be `null`, but the return type expects non-null numbers.

**Fix:** Add null checks and provide defaults:
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

### Category 12: Navigation Type Errors
**Files:**
- `src/helpers/bottomMenu.ts:64`
- `src/navigation/NavigationService.tsx:20`
- `src/screens/NewPoll.tsx:325`

**Errors:**
```
bottomMenu.ts(64,16): Argument of type '"PostReply" | "NewMessage" | "NewPost"' is not assignable to parameter of type 'BottomMenuNavigationScreens'
NavigationService.tsx(20,28): Navigation parameter type mismatch
NewPoll.tsx(325,16): No overload matches this call
```

**Root Cause:** Navigation screen names and parameter types don't match the defined navigation types.

**Fixes:**
1. Update `BottomMenuNavigationScreens` type to include all valid screens
2. Fix navigation calls to use proper screen names and parameters
3. Ensure type definitions match actual navigation structure

---

### Category 13: NewMessage & PostReply Upload Hook Errors
**Files:**
- `src/screens/NewMessage.tsx:190, 315, 448, 652`
- `src/screens/PostReply.tsx:242, 366, 376, 388, 428`

**Errors:**
```
NewMessage.tsx(190,5): Type 'number' has no properties in common with type 'MutationHookOptions<...>'
NewMessage.tsx(315,14): Navigation argument type mismatch
NewMessage.tsx(448,25): Argument of type 'Error' is not assignable to parameter of type 'string | ApolloError'
NewMessage.tsx(652,19): JSX element class does not support attributes
PostReply.tsx(242,14): Navigation argument type mismatch
PostReply.tsx(366,25): Error type mismatch
PostReply.tsx(376,9): Type 'boolean' is not assignable to type 'number'
PostReply.tsx(388,7): Argument of type 'boolean' is not assignable to parameter of type 'number'
PostReply.tsx(428,15): Property 'isLoading' does not exist, did you mean 'loading'?
```

**Root Cause:** Multiple issues:
1. `useStatefulUpload` hook signature changed
2. Error handling expects specific types
3. `HeaderItem` prop name changed from `isLoading` to `loading`
4. Type mismatches in boolean/number assignments

**Fixes:**
1. Update hook usage to match new signatures
2. Wrap errors properly: `errorHandlerAlert(error.message)` or cast appropriately
3. Change `isLoading` to `loading` in `HeaderItem` props
4. Fix type assignments

---

### Category 14: ThreadDetailsHeader Type Errors
**File:** `src/screens/Chat/components/ThreadDetailsHeader.tsx:45, 53, 54`

**Errors:**
```
ThreadDetailsHeader.tsx(45,7): Type 'string | undefined' is not assignable to type 'string'
ThreadDetailsHeader.tsx(45,17): 'safeMessage.user' is possibly 'undefined'
ThreadDetailsHeader.tsx(53,11): DeepPartialObject type mismatch
ThreadDetailsHeader.tsx(54,11): Type 'User | DeepPartialObject<...> | undefined' is not assignable to type 'User'
```

**Root Cause:** Optional chaining and partial types from GraphQL fragments not properly handled.

**Fix:** Add proper type guards and default values.

---

## Implementation Strategy

### Phase 1: Quick Wins (Low Risk, High Impact)
1. Fix missing hook exports in `src/api/hooks/index.ts`
2. Add `url` property to mock chat upload data
3. Remove `numberOfLines` prop from `HomePostItem`
4. Fix timer type in `RequestError.tsx`
5. Change `isLoading` to `loading` in `PostReply.tsx`

### Phase 2: Type Safety Improvements (Medium Risk)
1. Add null coalescing operators to all undefined string assignments
2. Fix image dimension type handling in `transformTopicToPost`
3. Update Avatar and CachedImage components for new React Native types
4. Fix ImageSkeleton dimension types

### Phase 3: Complex Refactoring (Higher Risk)
1. Fix GraphQL fragment partial types in PostItem components
2. Refactor `useChatChannelNotifications` to use proper REST patterns
3. Fix all navigation type mismatches
4. Update upload hook usage in NewMessage and PostReply

### Phase 4: Verification
1. Run `yarn test` after each phase
2. Run `yarn graphql:generate` to ensure GraphQL types are up to date
3. Test affected screens manually if possible

## Estimated Effort
- **Phase 1:** 30 minutes
- **Phase 2:** 1-2 hours  
- **Phase 3:** 2-3 hours
- **Phase 4:** 30 minutes

**Total:** 4-6 hours

## Risk Assessment
- **Low Risk:** Phases 1 & 2 (mostly adding defaults and fixing simple type mismatches)
- **Medium Risk:** Phase 3 (navigation and hook refactoring could affect runtime behavior)
- **High Risk:** None identified, but thorough testing recommended

## Dependencies
- Ensure `yarn graphql:generate` has been run recently
- Check that all dependencies are up to date
- Verify React Native version compatibility with Image API changes
