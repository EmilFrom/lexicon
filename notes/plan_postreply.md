# Plan: Fix lint errors in `src/screens/PostReply.tsx`

## Analysis
- The `yarn test` lint output shows multiple **unused variable/import** errors in `PostReply.tsx`:
  - `ActivityIndicator` (line 16)
  - `useDebouncedCallback` (line 20)
  - `Icon` (line 36)
  - `getReplacedImageUploadStatus` (line 52)
  - `insertImageUploadStatus` (line 55)
  - `discourseUrl` (line 149)
- These errors cause the test suite to fail because the lint step is treated as a test failure.
- No functional code appears to rely on these imports/variables, so they can be safely removed.
- Removing them will also clean up the file and improve bundle size.

## Proposed Changes (one file at a time)
1. **Remove unused imports**: Delete the import statements for the above items.
2. **Remove unused variable declarations**: Delete the variable declarations for `discourseUrl` and any others that are not used.
3. **Run lint** to verify no remaining errors in this file.
4. **Commit** the changes (user will approve each step).

## Next Steps
- Await user approval to apply the changes to `PostReply.tsx`.
- After approval, perform the edits and re‑run `yarn test` to ensure the errors are resolved.
