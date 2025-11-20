# Plan: Fetch Image Aspect Ratios from Plugin API

## Analysis
The user confirmed that image dimensions are calculated server-side and stored in the `discourse-lexicon-plugin`. They should be fetched via a REST request, not parsed from HTML attributes on the client.

**Server-Side Findings:**
-   **Plugin:** `discourse-lexicon-plugin`
-   **Endpoint:** `GET /lexicon/image-dimensions`
-   **Parameters:** `urls` (Array of strings, max 100)
-   **Response:** JSON object `{ dimensions: { "url": { width, height, aspectRatio }, ... } }`
-   **Model:** `LexiconImageDimension` stores this data.

**Goal:**
Update the frontend to fetch these dimensions for images displayed in the `PostDetail` view (specifically `PostDetailHeaderItem`) and use them to render the `ImageCarousel` with the correct aspect ratio.

## Implementation Plan

### 1. Create API Service
Create a new file `src/api/lexicon.ts` (or add to existing) to handle the API call.
-   **Function:** `fetchImageDimensions(urls: string[])`
-   **Endpoint:** `/lexicon/image-dimensions`
-   **Method:** `GET` (Note: Sending a body/complex params in GET can be tricky; usually libraries like `axios` or `query-string` handle array serialization like `urls[]=...`. We need to ensure the client constructs the query string correctly for Rails).

### 2. Create Custom Hook
Create `src/hooks/useImageDimensions.ts`.
-   **Input:** `images: string[]` (List of image URLs)
-   **Output:** `dimensions: Record<string, { width: number, height: number, aspectRatio: number }>`
-   **Logic:**
    -   Effect hook that triggers when `images` changes.
    -   Calls `fetchImageDimensions`.
    -   Manages `loading` and `error` states (optional but good practice).
    -   Returns the map of dimensions.

### 3. Update `PostDetailHeaderItem.tsx`
-   **Extract URLs:** We already extract `images` (array of strings) from the content.
-   **Fetch Data:** Use the `useImageDimensions` hook with these URLs.
-   **Pass Props:** Pass the resulting `dimensions` map to the `PostItem` component.

### 4. Update `PostItem.tsx`
-   **Props:** Add `imageDimensionsMap` (optional) to `Props`.
-   **Pass Down:** Pass the specific dimensions for the *current* image (or the map) to `ImageCarousel`.

### 5. Update `ImageCarousel.tsx`
-   **Props:** Update `serverDimensions` to be more robust or accept the dimension object directly.
-   **Logic:**
    -   Look up the dimensions for the current image.
    -   Use the `aspectRatio` from the server response.
    -   **Fallback:** If dimensions are not yet loaded (async fetch), keep the current default (Square/1.0) to prevent layout thrashing, or maybe a loading placeholder aspect ratio.

## Verification
-   Open a Post Detail view.
-   Verify network request to `/lexicon/image-dimensions`.
-   Verify `ImageCarousel` uses the returned aspect ratio.
-   Verify standard layout behavior (1.5 max height cap still applies).