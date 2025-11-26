# Yarn Test Errors Fix Plan

## Overview

This document provides a detailed analysis and implementation plan for fixing 70 linting/compilation errors (62 errors, 8 warnings) identified by `yarn test`. The errors span across multiple categories including React Hooks violations, TypeScript type issues, and React Compiler optimization warnings.

**Last Updated:** 2025-11-26  
**Status:** Most critical errors fixed, cleanup phase remaining

## Error Categories Summary (Current State)

| Category | Count | Severity | Status |
|----------|-------|----------|--------|
| TypeScript - unused vars/imports | 37 | Low | ✅ Cleanup needed |
| React Hooks - setState in effect | 6 | High | ⚠️ Needs fixing |
| React Hooks - preserve memoization | 4 | Medium | ⚠️ Needs fixing |
| TypeScript - explicit any | 5 | Medium | ✅ Cleanup needed |
| React Hooks - exhaustive deps | 7 | Medium | ⚠️ Review needed |
| TypeScript - ban-ts-comment | 1 | Low | ✅ Quick fix |
| React Hooks - unused eslint-disable | 1 | Low | ✅ Quick fix |

**Total: 62 errors, 8 warnings (70 problems)**  
**Progress: ~15 critical errors fixed, mainly cleanup remaining**  
**Remaining Effort: 1-2 days**

---

## Current Error Breakdown by File

### Files with Multiple Errors (Priority Order)

1. **`src/screens/Home/Home.tsx`** - 5 errors
   - 1 unused import (`StyleSheet`)
   - 4 setState in effect violations (lines 222, 233, 271, 278)

2. **`src/screens/NewPost.tsx`** - 8 errors, 1 warning
   - 2 unused imports (`ActivityIndicator`, `useDebouncedCallback`)
   - 1 setState in effect (line 319)
   - 2 explicit any types (line 328)
   - 1 unused variable (`data` at line 347)
   - 1 exhaustive-deps warning (line 490)

3. **`src/screens/PostReply.tsx`** - 6 errors
   - 5 unused imports
   - 1 unused variable (`discourseUrl`)

4. **`src/screens/NewMessage.tsx`** - 5 errors
   - 3 unused imports
   - 2 unused variables

5. **`src/screens/PostPreview.tsx`** - 6 errors, 1 warning
   - 4 unused variables
   - 1 exhaustive-deps warning

6. **`src/components/PostItem/HomePostItem.tsx`** - 2 errors
   - 2 preserve-manual-memoization errors (lines 54, 62)

7. **`src/components/PostItem/PostItem.tsx`** - 3 errors
   - 3 unused variables

8. **`src/components/MarkdownRenderer.tsx`** - 3 errors
   - 2 explicit any types (lines 60, 106)
   - 1 unused variable (`spacing`)

9. **`src/screens/Chat/ChatChannelDetail.tsx`** - 3 errors, 1 warning
   - 1 setState in effect (line 139)
   - 1 unused variable (`e` at line 473)
   - 1 exhaustive-deps warning (line 125)

10. **`src/hooks/usePrefetchVisibleTopics.ts`** - 1 error, 1 warning
    - 1 preserve-manual-memoization error (line 34)
    - 1 exhaustive-deps warning (line 97)

11. **`src/screens/EmailAddress/EmailAddress.tsx`** - 1 error
    - 1 setState in effect (line 55)

### Files with Single Errors (Quick Wins)

- `src/App.tsx` - 1 error: Use @ts-expect-error instead of @ts-ignore
- `src/components/NestedComment.tsx` - 2 errors: unused imports
- `src/components/RepliedPost.tsx` - 1 error: unused variable
- `src/components/SelectImagePreviewEdit.tsx` - 1 error: unused variable
- `src/core-ui/AuthenticatedImage.tsx` - 1 error: unused import
- `src/core-ui/Avatar/index.tsx` - 2 errors: unused variables
- `src/core-ui/CustomImage.tsx` - 1 error: unused import
- `src/hooks/rest/chat/useChatChannelNotifications.ts` - 2 errors: unused imports
- `src/hooks/useImageDimensions.ts` - 1 error, 2 warnings: unused import + exhaustive-deps
- `src/navigation/ProfileDrawerNavigator.tsx` - 2 errors: unused imports
- `src/screens/Messages/Messages.tsx` - 2 errors: unused import + unused variable
- `src/screens/Notifications/Notifications.tsx` - 1 error: unused import
- `src/screens/Search.tsx` - 1 warning: exhaustive-deps + 1 unused eslint-disable
- `src/utils/useLazyQuery.ts` - 3 errors: unused variables
- `src/utils/useQuery.ts` - 3 errors: unused variables

---

## Detailed Error Analysis & Fix Strategy

### 1. React Hooks - setState in Effect (9 errors) ⚠️ HIGH PRIORITY

**Severity: High** | **Effort: Medium** | **Estimated Time: 4-6 hours**

#### Affected Files:
1. `src/components/NestedComment.tsx` (line 125)
2. `src/hooks/useFirstPostContent.ts` (lines 68, 88)
3. `src/navigation/ProfileDrawerNavigator.tsx` (line 122)
4. `src/screens/Chat/ChatChannelDetail.tsx` (line 133)
5. `src/screens/Messages/Messages.tsx` (line 69)
6. `src/screens/NewPost.tsx` (line 281)
7. `src/screens/Notifications/Notifications.tsx` (line 95)
8. `src/screens/PostDraft.tsx` (line 74)

#### Problem:
Calling `setState` synchronously within `useEffect` causes cascading renders and performance issues. This is an anti-pattern that can lead to:
- Unnecessary re-renders
- Performance degradation
- Potential infinite loops
- Harder to debug state updates

#### Fix Strategy:
**Option A: Derive state from props/data (preferred)**
```typescript
// Instead of:
useEffect(() => {
  if (data) {
    setState(data.value);
  }
}, [data]);

// Use:
const derivedValue = data?.value ?? defaultValue;
```

**Option B: Use state initializer**
```typescript
// For initial data loading:
const [state, setState] = useState(() => initialData);
```

**Option C: Move to event handler**
```typescript
// If triggered by user action, move to handler:
const handleAction = () => {
  setState(newValue);
};
```

#### Implementation Steps:
1. **NestedComment.tsx**: Derive `content` and `hidden` directly from `postRawData`
2. **useFirstPostContent.ts**: Refactor to use derived state or move logic to event handlers
3. **ProfileDrawerNavigator.tsx**: Derive user state from query data
4. **ChatChannelDetail.tsx**: Derive messages from query response
5. **Messages.tsx**: Remove setState from effect, derive loading state
6. **NewPost.tsx**: Move image processing to event handler or use ref
7. **Notifications.tsx**: Derive error message directly from error object
8. **PostDraft.tsx**: Derive `hasMore` from data length calculation

---

### 2. React Hooks - Refs During Render (5 errors) ⚠️ HIGH PRIORITY

**Severity: High** | **Effort: Medium** | **Estimated Time: 3-4 hours**

#### Affected Files:
1. `src/hooks/usePrefetchVisibleTopics.ts` (line 37)
2. `src/screens/Home/Home.tsx` (lines 753, 776, 780)

#### Problem:
Accessing `ref.current` during render causes components to not update as expected. Refs should only be accessed in:
- Event handlers
- Effects
- Callbacks

#### Fix Strategy:
**For usePrefetchVisibleTopics.ts:**
```typescript
// Instead of filtering in useMemo:
const newTopicsToFetch = useMemo(
  () => topicsToFetch.filter((id) => !prefetchedIds.current.has(id)),
  [topicsToFetch],
);

// Move to useEffect or event handler:
useEffect(() => {
  const newTopics = topicsToFetch.filter((id) => !prefetchedIds.current.has(id));
  // Process newTopics
}, [topicsToFetch]);
```

**For Home.tsx:**
```typescript
// Extract homeContent logic to useEffect or useMemo without refs
// Store computed values in state instead of accessing refs during render
```

---

### 3. TypeScript - Unused Variables/Imports (30 errors) ✅ LOW PRIORITY

**Severity: Low** | **Effort: Low** | **Estimated Time: 1-2 hours**

#### Affected Files:
Multiple files with unused imports, variables, and function parameters.

#### Fix Strategy:
Simple cleanup - remove or prefix with underscore:
```typescript
// Remove unused imports
- import { useNavigation } from '@react-navigation/native';

// Or prefix unused params with underscore
- const handleClick = (event) => { ... }
+ const handleClick = (_event) => { ... }
```

#### Implementation:
Run automated fix where possible:
```bash
# ESLint can auto-fix many of these
npx eslint --fix src/**/*.{ts,tsx}
```

Manual review required for:
- Variables that appear unused but might be needed for future features
- Function parameters that are part of required signatures

---

### 4. TypeScript - Explicit Any (6 errors) ⚠️ MEDIUM PRIORITY

**Severity: Medium** | **Effort: Low** | **Estimated Time: 2 hours**

#### Affected Files:
1. `src/components/MarkdownRenderer.tsx` (lines 59, 105)
2. `src/core-ui/AuthenticatedImage.tsx` (line 91)
3. `src/core-ui/CustomImage.tsx` (line 80)
4. `src/screens/Home/Home.tsx` (lines 290, 292)

#### Problem:
Using `any` bypasses TypeScript's type safety, leading to potential runtime errors.

#### Fix Strategy:
Replace with proper types:
```typescript
// Instead of:
const handleEvent = (e: any) => { ... }

// Use proper type:
const handleEvent = (e: React.MouseEvent<HTMLElement>) => { ... }

// Or create interface:
interface CustomEventData {
  value: string;
  timestamp: number;
}
const handleEvent = (e: CustomEventData) => { ... }
```

---

### 5. React Hooks - Preserve Manual Memoization (3 errors) ⚠️ MEDIUM PRIORITY

**Severity: Medium** | **Effort: Medium** | **Estimated Time: 2-3 hours**

#### Affected Files:
1. `src/components/PostItem/HomePostItem.tsx` (lines 54, 62)
2. `src/screens/NewPost.tsx` (line 458)

#### Problem:
React Compiler cannot preserve manual memoization because dependencies may be mutated.

#### Fix Strategy:
**HomePostItem.tsx:**
```typescript
// Issue: 'content' dependency may be mutated
// Solution: Ensure content is immutable or use stable reference
const stableContent = useMemo(() => content, [content]);
const onPressPost = useCallback(() => {
  navigate('PostDetail', {
    topicId,
    prevScreen,
    focusedPostNumber: undefined,
    content: stableContent,
    hidden: isHidden,
  });
}, [navigate, topicId, prevScreen, stableContent, isHidden]);
```

**NewPost.tsx:**
```typescript
// Issue: 'selectedTags' may be mutated
// Solution: Use immutable update pattern or freeze object
const stableTags = useMemo(() => [...selectedTags], [selectedTags]);
```

---

### 6. React Hooks - Static Components (1 error) ⚠️ HIGH PRIORITY

**Severity: High** | **Effort: Medium** | **Estimated Time: 1 hour**

#### Affected File:
`src/screens/NewPost.tsx` (line 506)

#### Problem:
Component `Header` is created during render, causing it to reset state on every render.

#### Fix Strategy:
```typescript
// Instead of:
const NewPost = () => {
  const Header = () => ( ... );
  return <Header />;
};

// Move outside:
const Header = () => ( ... );
const NewPost = () => {
  return <Header />;
};

// Or if it needs props:
const Header = ({ prop1, prop2 }: HeaderProps) => ( ... );
const NewPost = () => {
  return <Header prop1={value1} prop2={value2} />;
};
```

---

### 7. React Hooks - Immutability (1 error) ⚠️ HIGH PRIORITY

**Severity: High** | **Effort: Medium** | **Estimated Time: 1 hour**

#### Affected File:
`src/screens/EmailAddress/EmailAddress.tsx` (line 48)

#### Problem:
`onSetLoading` is accessed before it's declared, preventing proper closure updates.

#### Fix Strategy:
```typescript
// Instead of:
useEffect(() => {
  // ...
  onSetLoading(false); // Used before declared
}, [profileData]);

const onSetLoading = (value: boolean) => {
  setLoading(value);
};

// Fix: Declare before use
const onSetLoading = useCallback((value: boolean) => {
  setLoading(value);
}, []);

useEffect(() => {
  // ...
  onSetLoading(false);
}, [profileData, onSetLoading]);
```

---

### 8. React Hooks - Rules of Hooks (1 error) ⚠️ HIGH PRIORITY

**Severity: High** | **Effort: Low** | **Estimated Time: 30 minutes**

#### Affected File:
`src/App.tsx` (line 53)

#### Problem:
`useApolloClientDevTools` is called conditionally, violating the Rules of Hooks.

#### Fix Strategy:
```typescript
// Instead of:
if (__DEV__) {
  useApolloClientDevTools(client);
}

// Always call, conditionally execute:
useApolloClientDevTools(__DEV__ ? client : null);

// Or move condition inside hook implementation
```

---

### 9. React Hooks - Exhaustive Deps (4 warnings) ⚠️ MEDIUM PRIORITY

**Severity: Medium** | **Effort: Low** | **Estimated Time: 1-2 hours**

#### Affected Files:
1. `src/hooks/useImageDimensions.ts` (line 71)
2. `src/hooks/usePrefetchVisibleTopics.ts` (line 87)
3. `src/screens/NewPost.tsx` (line 450)
4. `src/screens/Search.tsx` (line 109)

#### Fix Strategy:
Add missing dependencies or use ESLint disable comment if intentional:
```typescript
// Add missing deps:
useEffect(() => {
  // ...
}, [dep1, dep2, missingDep]);

// Or if intentional:
useEffect(() => {
  // ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dep1, dep2]);
```

---

## Implementation Priority Order

### Phase 1: Critical Fixes (Day 1) 🔴
**Estimated Time: 6-8 hours**

1. **React Hooks - Rules of Hooks** (`App.tsx`)
   - Blocking issue, must be fixed first
   - 30 minutes

2. **React Hooks - Static Components** (`NewPost.tsx`)
   - Causes state reset bugs
   - 1 hour

3. **React Hooks - Immutability** (`EmailAddress.tsx`)
   - Prevents proper updates
   - 1 hour

4. **React Hooks - setState in Effect** (9 files)
   - Performance and correctness issues
   - 4-6 hours

### Phase 2: Important Fixes (Day 2) 🟡
**Estimated Time: 6-8 hours**

5. **React Hooks - Refs During Render** (2 files)
   - Causes update issues
   - 3-4 hours

6. **TypeScript - Explicit Any** (4 files)
   - Type safety issues
   - 2 hours

7. **React Hooks - Preserve Memoization** (2 files)
   - Performance optimization
   - 2-3 hours

### Phase 3: Cleanup (Day 3) 🟢
**Estimated Time: 3-4 hours**

8. **TypeScript - Unused Variables** (30 instances)
   - Code cleanup
   - 1-2 hours

9. **React Hooks - Exhaustive Deps** (4 warnings)
   - Dependency correctness
   - 1-2 hours

---

## Testing Strategy

After each phase:

1. **Run linter:**
   ```bash
   yarn test
   ```

2. **Run type check:**
   ```bash
   yarn tsc --noEmit
   ```

3. **Manual testing:**
   - Test affected screens/components
   - Verify no regressions
   - Check performance improvements

4. **E2E tests:**
   ```bash
   yarn tests:ios:build
   yarn tests:ios:test
   ```

---

## Risk Assessment

### High Risk Changes:
- **setState in effect refactors**: May change component behavior
- **Refs during render fixes**: Could affect rendering logic
- **Static component extraction**: May require prop threading

### Mitigation:
- Test each file individually after changes
- Use feature flags for risky changes
- Keep git commits granular for easy rollback
- Pair program on high-risk changes

### Low Risk Changes:
- Unused variable removal
- Adding missing dependencies
- Fixing explicit any types

---

## Success Criteria

- [ ] All 73 errors resolved
- [ ] All 6 warnings addressed or documented
- [ ] `yarn test` passes with 0 errors
- [ ] No new TypeScript errors introduced
- [ ] All existing E2E tests pass
- [ ] Manual smoke testing completed
- [ ] Performance metrics maintained or improved

---

## Effort Estimation Summary

| Priority | Errors | Time Estimate | Complexity |
|----------|--------|---------------|------------|
| 🔴 Critical | 12 | 6-8 hours | High |
| 🟡 Important | 33 | 6-8 hours | Medium |
| 🟢 Cleanup | 34 | 3-4 hours | Low |
| **TOTAL** | **79** | **15-20 hours (2-3 days)** | **Mixed** |

---

## Notes

- Some fixes may resolve multiple errors (e.g., fixing one file with multiple issues)
- Automated tools can help with ~40% of the errors (unused vars, some deps)
- The remaining 60% require careful manual refactoring
- Consider creating helper hooks for common patterns (e.g., derived state from queries)
- Document any intentional ESLint disables with comments explaining why

---

## Next Steps

1. Review and approve this plan
2. Create feature branch: `fix/yarn-test-errors`
3. Begin Phase 1 (Critical Fixes)
4. Submit PR after each phase for incremental review
5. Update this document with actual time spent vs. estimates
