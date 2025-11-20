# Plan to Fix Post-Integration TypeScript Errors

## 1. Analysis

This plan addresses the new set of TypeScript errors that arose after the last implementation. The errors are located in three files and are due to a type guard regression, a missing prop definition, and an incorrect function signature.

## 2. Plan

---

### Part 1: Fix Type Guard in `MarkdownRenderer.tsx`

**Objective:** Correct the type guard used to identify element nodes to be compatible with the installed version of `react-native-render-html`.

**File Path:** `src/components/MarkdownRenderer.tsx`

**Corrected Code Snippet:**

*The change is in the `details` renderer. We will use `'tagName' in c` as the type guard.*

```typescript
// ... inside MarkdownRenderer.tsx
    details: ({ TDefaultRenderer, tnode, ...props }: any) => {
      const summaryNode = tnode.children.find(
        // FIX: Use 'tagName' in c as the type guard
        (c: TNode) => 'tagName' in c && c.tagName === 'summary'
      );
      
      let title = 'Details';
      if (summaryNode && summaryNode.children[0] && summaryNode.children[0].type === 'text') {
        title = summaryNode.children[0].data;
      }

      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c: TNode) => c !== summaryNode),
      };

      return (
        <Collapsible title={title}>
          <TDefaultRenderer tnode={contentTNode} {...props} />
        </Collapsible>
      );
    },
// ...
```

---

### Part 2: Add `images` Prop to `PostItem.tsx`

**Objective:** Update the `PostItem` component to officially accept an `images` prop, which will resolve the error in `PostDetailHeaderItem.tsx`.

**File Path:** `src/components/PostItem/PostItem.tsx`

**Corrected Code Snippet:**

*Add `images?: Array<string>;` to the `Props` type definition.*

```typescript
// ... inside PostItem.tsx

type Props = ViewProps & {
  topicId: number;
  title: string;
  content: string;
  username: string;
  avatar: string;
  channel: Channel;
  createdAt: string;
  isLiked: boolean;
  tags?: Array<string>;
  hidden?: boolean;
  showLabel?: boolean;
  currentUser?: string;
  showImageRow?: boolean;
  nonclickable?: boolean;
  prevScreen?: string;
  images?: Array<string>; // <-- ADD THIS LINE
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
  isHidden?: boolean;
  footer?: React.ReactNode;
  mentionedUsers?: Array<string>;
  onPressViewIgnoredContent?: () => void;
  showStatus?: boolean;
  emojiCode?: string;
  polls?: Array<Poll>;
  pollsVotes?: Array<PollsVotes>;
  postId?: number;
  testIDStatus?: string;
  pinned?: boolean;
};

function BasePostItem(props: Props) {
  // ... The rest of the file remains the same.
  // The component will now correctly receive and use the `images` prop.
}
```

---

### Part 3: Fix `onError` Handlers in `PostPreview.tsx`

**Objective:** Wrap the `errorHandlerAlert` calls in new functions to match the signature expected by the Apollo Client mutation hooks.

**File Path:** `src/screens/PostPreview.tsx`

**Corrected Code Snippets:**

*Wrap `errorHandlerAlert` in each of the three hooks.*

```typescript
// ... inside PostPreview.tsx

  const { newTopic, loading: newTopicLoading } = useNewTopic({
    onCompleted: () => {
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    refetchQueries,
    // FIX: Wrap the call
    onError: (error) => errorHandlerAlert(error),
  });

  const { reply: replyTopic, loading: replyLoading } = useReplyTopic({
    onCompleted: () => {
      if (postData?.topicId) {
        client.cache.evict({
          id: client.cache.identify({
            __typename: 'TopicDetailOutput',
            id: postData.topicId,
          }),
        });
        client.cache.evict({ fieldName: 'topicDetail' });
        client.cache.gc();
      }
      setTimeout(() => {
        navigation.pop(2);
        resetForm(FORM_DEFAULT_VALUES);
      }, 0);
    },
    // FIX: Wrap the call
    onError: (error) => errorHandlerAlert(error),
  });

  const { editPost, loading: editPostLoading } = useEditPost({
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

This plan is now ready for your review and approval.
