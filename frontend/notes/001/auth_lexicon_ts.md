# Plan: Add Authentication to Lexicon API Helper

## Goal
Update `src/helpers/api/lexicon.ts` to include the necessary authentication headers (`Authorization` and `User-Api-Key`) when making requests to the backend. This ensures the `/lexicon/image-dimensions` endpoint recognizes the user.

## Analysis
-   **Current State:** The helper uses `fetch` but only sets `Content-Type`. It lacks the user token logic present in `src/api/client.ts`.
-   **Auth Source:** The main Apollo client retrieves the token from `tokenVar` (in `src/reactiveVars`) and uses `decodeToken` (in `src/helpers`) to generate the `User-Api-Key`.
-   **Required Changes:** We must replicate this logic in `lexicon.ts`.

## Implementation Steps

### 1. Imports
Update imports in `src/helpers/api/lexicon.ts` to include:
-   `decodeToken` from `../../helpers`
-   `tokenVar` from `../../reactiveVars`

### 2. Header Logic
Inside `fetchImageDimensions`, before the `fetch` call:
1.  Get the current token: `const token = tokenVar();`
2.  Prepare a headers object.
3.  If `token` exists:
    -   Set `Authorization` header to `token`.
    -   Set `User-Api-Key` header to `decodeToken(token)`.

### 3. Update Fetch Call
Pass the updated `headers` object to the `fetch` function.

### 4. Verification
-   Ensure no TypeScript errors regarding missing imports.
-   (Implicit) Network requests should now include these headers when inspected.

## Code Snippet (Reference)

```typescript
    const token = tokenVar();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = token;
      headers['User-Api-Key'] = decodeToken(token);
    }
```
