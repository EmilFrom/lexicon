# Fix Plan: Post Detail Images Not Showing

## Analysis
The user reported that images are not showing in the Topic Detail view, despite logs indicating that `PostDetailHeaderItem` successfully extracted image URLs. The `ImageCarousel` component was expected to render (even with debug colors) but nothing was visible.

Investigation revealed:
1.  `PostDetailHeaderItem` extracts images correctly and passes them to `PostItem` via the `images` prop.
2.  `PostDetailHeaderItem` sets the `nonclickable={true}` prop on `PostItem`.
3.  Inside `PostItem.tsx`, the rendering logic splits based on the `nonclickable` prop.
4.  **The Bug:** In the `nonclickable` branch (which renders the detail view content), the `{imageContent}` (which contains the `ImageCarousel`) is explicitly omitted.

## Proposed Changes
1.  Modify `src/components/PostItem/PostItem.tsx`.
2.  Locate the `wrappedMainContent` definition.
3.  In the `else` block (where `nonclickable` is true), add `{imageContent}` to the rendered fragment, typically after `mainContent` and `pollsContent`, to match the layout of the clickable version.

## Verification
-   The user's visual debugging (Red/Blue/Yellow backgrounds) should become visible once `ImageCarousel` is actually rendered.
-   The images should appear in the Post Detail header.