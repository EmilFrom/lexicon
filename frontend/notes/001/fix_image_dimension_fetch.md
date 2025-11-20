# Fix Image Dimension Fetch Plan

## Analysis
The application is experiencing errors when fetching image dimensions:
- `429 Too Many Requests`: Indicates the server is rate-limiting the requests.
- `JSON Parse error`: Indicates the server is likely returning an HTML error page (e.g., 404 or 500) instead of JSON.

Investigation revealed a bug in `src/helpers/api/lexicon.ts`. The `fetchImageDimensions` function constructs an authentication header object (including `Authorization` and `User-Api-Key`) but fails to pass it to the `fetch` function. Instead, it creates a new headers object inline, effectively sending an unauthenticated request.

## Plan
1.  **Update `src/helpers/api/lexicon.ts`:**
    -   Modify the `fetch` call to use the constructed `headers` variable.
    -   Ensure `Content-Type` is present in the `headers` variable (it already is).

## Verification
-   The fix will be verified by code inspection, as the bug is a clear logic error.
-   After the fix, the `fetch` call should correctly include the authentication tokens, which should resolve the 429 errors (assuming the authenticated user has higher limits) and the JSON parse errors (assuming the server returns valid JSON for authenticated requests).
