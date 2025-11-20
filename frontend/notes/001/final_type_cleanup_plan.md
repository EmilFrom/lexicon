# Final TypeScript Error Cleanup Plan

## 1. Analysis

This plan addresses the final three TypeScript errors. The root causes are a missing prop definition on the `PostItem` component and one remaining incorrect `onError` handler in `PostPreview`.

## 2. Plan

---

### Part 1: Add `mentionedUsers` Prop to `PostItem.tsx`

**Objective:** Update the `PostItem` component to accept the `mentionedUsers` prop. This will resolve the two errors in `PostDetailHeaderItem.tsx`.

**File Path:** `src/components/PostItem/PostItem.tsx`

**Corrected Code Snippet:**

*Add `mentionedUsers?: Array<string>;` to the `Props` type definition.*

```typescript
// ... inside PostItem.tsx

type Props = ViewProps & {
  // ... (other props)
  images?: Array<string>;
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
  isHidden?: boolean;
  footer?: React.ReactNode;
  mentionedUsers?: Array<string>; // <-- ADD THIS LINE
  onPressViewIgnoredContent?: () => void;
  showStatus?: boolean;
  // ... (other props)
};

function BasePostItem(props: Props) {
  // ... The rest of the file remains the same.
  // It already correctly passes `mentionedUsers` down to the renderer,
  // so no other change is needed in this file.
}
```

---

### Part 2: Fix `onError` Handler in `PostPreview.tsx`

**Objective:** Correct the `onError` handler for the `useEditTopic` hook to match the expected function signature.

**File Path:** `src/screens/PostPreview.tsx`

**Corrected Code Snippet:**

*Wrap the `errorHandlerAlert` call in the `useEditTopic` hook.*

```typescript
// ... inside PostPreview.tsx

  const { editTopic, loading: editTopicLoading } = useEditTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    // FIX: Wrap the call
    onError: (error) => errorHandlerAlert(error),
  });

// ...
```

## 3. Approval

This plan is now ready for your review and approval. Once these changes are implemented, all TypeScript errors should be resolved.
