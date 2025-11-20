# Fix Image Dimension Fetch Plan

## Analysis
The application is experiencing errors when fetching image dimensions:
-   `429 Too Many Requests`: Indicates the server is rate-limiting the requests.
-   `JSON Parse error`: Indicates the server is likely returning an HTML error page (e.g., 404 or 500) instead of JSON.

Investigation revealed a bug in `src/helpers/api/lexicon.ts`. The `fetchImageDimensions` function constructs an authentication header object (including `Authorization` and `User-Api-Key`) but fails to pass it to the `fetch` function. Instead, it creates a new headers object inline, effectively sending an unauthenticated request.

**ELI5 Analysis:**
The app tries to ask the server for image sizes. It prepares a "pass" (authentication token) to show it's allowed to ask, but then it forgets to show the pass when it actually asks! Because it doesn't show the pass, the server treats it like a stranger and says "You're asking too much!" (Error 429) or gives a confusing answer (JSON Parse Error).

## Step-by-Step Implementation Guide (ELI5)

### Step 1: Open the file
We need to go to the file where the "asking" happens.
**File:** `src/helpers/api/lexicon.ts`

### Step 2: Find the mistake
Look for the part where the code says `fetch(...)`.
Currently, it looks like this:
```typescript
    const response = await fetch(`${discourseHost}/lexicon/image-dimensions?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers if the endpoint requires them, 
        // though usually cookies/session handle this for the app.
      },
    });
```
See how `headers` is a new list that *only* has `Content-Type`? It ignores the `headers` list we made just above it!

### Step 3: Fix the code
We need to tell `fetch` to use the `headers` list we already built (which has the secret pass/token in it).

**Change it to this:**
```typescript
    const response = await fetch(`${discourseHost}/lexicon/image-dimensions?${queryString}`, {
      method: 'GET',
      headers, // <--- This is the fix! We use the variable 'headers' we made earlier.
    });
```

## Help and Notes

-   **Why did this happen?** It looks like someone started writing the code to add the token (making the `headers` variable) but forgot to actually *use* it in the final step.
-   **What is `429`?** This is an HTTP status code that means "Too Many Requests". Without the token, the server thinks you are an anonymous user, and anonymous users aren't allowed to make as many requests as logged-in users.
-   **What is the JSON error?** When the server errors out (like the 429 above), it often sends back an HTML page explaining the error (like a "Whoops!" web page). The app expects a JSON (data) answer. When it tries to read the HTML page as data, it gets confused by the `<` character (start of an HTML tag) and crashes.