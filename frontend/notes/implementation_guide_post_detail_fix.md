# Implementation Guide: Fetch Image Dimensions from Plugin

## Overview
We will implement a mechanism to fetch precise image dimensions and aspect ratios from the `discourse-lexicon-plugin` API (`/lexicon/image-dimensions`). This ensures the `ImageCarousel` renders images with the correct server-calculated aspect ratio.

## 1. Create API Helper
Create a new file to handle the specific API request.

**File:** `src/helpers/api/lexicon.ts`
```typescript
import { client } from '../../api/client'; // Assuming you have a configured axios/fetch client or we use fetch directly. 
// If 'client' is Apollo, we likely need a REST fetcher. 
// Looking at 'src/api/client.ts' usually reveals the setup. 
// For now, I'll assume a standard fetch wrapper or use the existing REST client if available.
// Based on file list, 'src/api/client.ts' exists. 

import { discourseHost } from '../../constants';

export type ImageDimension = {
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
};

export type ImageDimensionsResponse = {
  dimensions: Record<string, ImageDimension>;
};

export const fetchImageDimensions = async (urls: string[]): Promise<Record<string, ImageDimension>> => {
  if (!urls || urls.length === 0) return {};

  try {
    // Construct query string manually to ensure correct format for Rails (urls[]=...)
    const queryString = urls
      .map((url) => `urls[]=${encodeURIComponent(url)}`)
      .join('&');
    
    const response = await fetch(`${discourseHost}/lexicon/image-dimensions?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any necessary auth headers if the endpoint requires them, 
        // though usually cookies/session handle this for the app.
      },
    });

    if (!response.ok) {
      console.warn('[Lexicon] Failed to fetch image dimensions:', response.status);
      return {};
    }

    const data: ImageDimensionsResponse = await response.json();
    return data.dimensions;
  } catch (error) {
    console.warn('[Lexicon] Error fetching image dimensions:', error);
    return {};
  }
};
```

## 2. Create React Hook
Create a hook to easily use this API in components.

**File:** `src/hooks/useImageDimensions.ts`
```typescript
import { useEffect, useState } from 'react';
import { fetchImageDimensions, ImageDimension } from '../helpers/api/lexicon';

export function useImageDimensions(urls: string[]) {
  const [dimensions, setDimensions] = useState<Record<string, ImageDimension>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDimensions = async () => {
      if (!urls || urls.length === 0) return;
      
      setLoading(true);
      const data = await fetchImageDimensions(urls);
      
      if (isMounted) {
        setDimensions(data);
        setLoading(false);
      }
    };

    loadDimensions();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(urls)]); // Simple array dependency check

  return { dimensions, loading };
}
```

## 3. Update `PostDetailHeaderItem.tsx`
Fetch dimensions and pass them down.

**File:** `src/components/PostItem/PostDetailHeaderItem.tsx`

**Imports:**
```typescript
import { useImageDimensions } from '../../hooks/useImageDimensions';
```

**Inside Component:**
```typescript
  // ... existing code ...
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  // ... existing code ...

  // --- ADD THIS ---
  const { dimensions } = useImageDimensions(images);
  // ----------------
  
  // ... later in the return statement ...
  return (
    <PostItem
      // ... existing props ...
      images={images}
      imageDimensionsMap={dimensions} // Pass the map
      // ...
    />
  );
```

## 4. Update `PostItem.tsx`
Accept the new prop and pass the specific dimension to the carousel.

**File:** `src/components/PostItem/PostItem.tsx`

**Update Props Interface:**
```typescript
import { ImageDimension } from '../../helpers/api/lexicon'; // Import type

type Props = ViewProps & {
  // ... existing props ...
  imageDimensionsMap?: Record<string, ImageDimension>; // Add this
};
```

**Update Render Logic:**
```typescript
// Inside BasePostItem
const { 
  // ... existing destructuring ...
  imageDimensionsMap, 
  // ... 
} = props;

// ...

// When creating ImageCarousel
const imageContent = (
  <View style={{ minHeight: images.length ? 20 : 0 }}>
    <ImageCarousel
      images={images}
      onImagePress={(uri) => setFullScreenImage(uri)}
      // If we have dimensions for the first image, pass them.
      // Or pass the whole map if ImageCarousel handles multiple images deeper.
      // For now, keeping with current pattern of passing "serverDimensions" for the active/first one.
      serverDimensions={images.length > 0 && imageDimensionsMap ? imageDimensionsMap[images[0]] : imageDimensions}
    />
  </View>
);
```

## 5. Update `ImageCarousel.tsx`
Ensure it uses the exact aspect ratio from the server if provided.

**File:** `src/components/ImageCarousel.tsx`

**Update Logic (inside the component):**
The logic we updated in the previous step (v2 fix) handles `serverDimensions` correctly. We just need to ensure `aspectRatio` is prioritized.

```typescript
// Verify this logic exists or update it:
  let aspectRatio = 1.0; // Default
  if (serverDimensions) {
    // The server returns 'aspectRatio' directly now
    if (serverDimensions.aspectRatio) {
      aspectRatio = serverDimensions.aspectRatio;
    } else if (serverDimensions.width && serverDimensions.height) {
      aspectRatio = serverDimensions.width / serverDimensions.height;
    }
  }
```

## 6. Export Hook
Don't forget to export the new hook in `src/hooks/index.ts` if that's the project convention.
