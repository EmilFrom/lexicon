# Corrected Plan to Fix Image Caching and Scrolling Performance

## 1. Analysis

I have reviewed the original plan (`image_caching_fix_plan.md`) and performed a deep codebase investigation. While I agree with the core premise—switching to `expo-image` to solve the flickering issues caused by the `useAuthenticatedImage` hook—the original plan is **incomplete and dangerous** for the following reasons:

1.  **Breaking Changes to `AuthenticatedImage`**: The original plan removes critical props (`onPress`, `maxHeightRatio`, `showSkeleton`) that are currently used by consumers like `ImageCarousel.tsx`. Implementing the plan as-written would break the image carousel functionality.
2.  **Incomplete Refactor**: The plan identifies `useAuthenticatedImage.ts` for deletion but fails to account for other components that depend on it: `src/core-ui/Avatar/index.tsx` and `src/core-ui/CustomImage.tsx`. Deleting the hook without refactoring these would cause build errors.
3.  **Logic Gaps**: `CustomImage` and `Avatar` rely on the hook for auth token handling. This logic needs to be moved into the components themselves, utilizing `expo-image`'s `headers` support.

This corrected plan addresses these issues by ensuring all consumers of the hook are properly refactored before the hook is deleted, and that `AuthenticatedImage` maintains backward compatibility.

## 2. Plan

### Step 1: Refactor `AuthenticatedImage.tsx`
**Objective:** Replace the custom hook with `expo-image` while preserving all existing props and functionality (`onPress`, sizing logic, skeleton).

**File:** `src/core-ui/AuthenticatedImage.tsx`

**Implementation Details:**
*   Remove `useAuthenticatedImage` hook.
*   Retrieve auth token using `useReactiveVar(tokenVar)` (consistent with current hook usage).
*   Use `Image` from `expo-image`.
*   Construct `source` object with `{ uri: url, headers: { Authorization: ... } }`.
*   Maintain `isLoading` state locally (using `onLoadStart` and `onLoad` events) to toggle the `ImageSkeleton`.
*   Preserve `maxHeightRatio` calculation logic using `useWindowDimensions`.
*   Preserve `onPress` wrapper.

### Step 2: Refactor `Avatar/index.tsx`
**Objective:** Remove dependence on `useAuthenticatedImage`.

**File:** `src/core-ui/Avatar/index.tsx`

**Implementation Details:**
*   Remove `useAuthenticatedImage` hook.
*   Retrieve auth token using `useReactiveVar(tokenVar)`.
*   Construct `source` object with headers.
*   Pass the new `source` to the existing `expo-image` component.
*   Ensure `onLoadEnd` and `onError` handlers correctly manage the local loading/error states.

### Step 3: Refactor `CustomImage.tsx`
**Objective:** Remove dependence on `useAuthenticatedImage`.

**File:** `src/core-ui/CustomImage.tsx`

**Implementation Details:**
*   Remove `useAuthenticatedImage` hook.
*   Retrieve auth token.
*   Construct `source` object with headers.
*   Initialize local `isDownloading` state to `true` (if src exists).
*   Pass the new `source` to the `CachedImage` component.
    *   *Note:* `CachedImage` (src/core-ui/CachedImage.tsx) already handles `expo-image` for remote URIs.
*   Update `handleImageLoad` and `handleImageError` to set `isDownloading` to `false`.

### Step 4: Delete `useAuthenticatedImage.ts`
**Objective:** Cleanup dead code.

**File:** `src/hooks/useAuthenticatedImage.ts`

**Action:** Delete the file.

### Step 5: Verify Usage
**Objective:** Ensure no other files import the deleted hook.

**Action:** Run a search for `useAuthenticatedImage` to confirm zero matches.

## 3. Approval
This plan is ready for review. It safely migrates all image handling to `expo-image` without breaking existing features.
