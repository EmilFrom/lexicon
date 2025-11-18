# Plan to Fix Image Caching and Scrolling Performance

## 1. Analysis

The debugger logs show that the current `AuthenticatedImage` component is successfully caching images to disk. However, the user-reported issue of images "loading out of memory when scrolling" points to a performance bottleneck related to how these cached images are displayed in a virtualized list.

The root cause is the "flicker" effect. When a `FlatList` re-mounts a component, our custom `useAuthenticatedImage` hook must perform an asynchronous check on the file system. During this brief moment, the image is not displayed. This rapid mount/unmount/check cycle during scrolling creates the perception that images are being constantly reloaded.

The solution is to replace our manual caching logic with the highly optimized, purpose-built `expo-image` library, which is already a project dependency. `expo-image` has a sophisticated multi-layer cache (memory and disk) designed to eliminate this flicker and provide a smooth scrolling experience.

## 2. Plan

The plan is to refactor `AuthenticatedImage.tsx` to be a simple, performant wrapper around `expo-image` and then remove the now-redundant custom hook.

---

### Part 1: Refactor `AuthenticatedImage.tsx`

**Objective:** Replace the custom logic with the `Image` component from `expo-image`, passing the required authentication headers for private images.

**File Path:** `src/core-ui/AuthenticatedImage.tsx`

**Full, Refactored Code:**
```typescript
import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useStorage } from '../helpers';
import { makeStyles } from '../theme';

type Props = {
  url: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: any;
  serverDimensions?: {
    width: number;
    height: number;
    aspectRatio?: number;
  };
};

export function AuthenticatedImage(props: Props) {
  const { url, style, imageStyle, serverDimensions } = props;
  const styles = useStyles();
  const storage = useStorage();
  const token = storage.getItem('token');

  // Construct the source object for Expo Image, including auth headers
  const source = {
    uri: url,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Use server-provided dimensions for initial layout, preventing content shift
  const containerStyle = [
    styles.container,
    style,
    serverDimensions && { aspectRatio: serverDimensions.aspectRatio || 1 },
  ];

  return (
    <View style={containerStyle}>
      <Image
        source={source}
        style={[styles.image, imageStyle]}
        contentFit="cover"
        transition={200} // Optional: adds a fade-in transition
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    backgroundColor: colors.backgroundDarker,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
}));
```

---

### Part 2: Mark `useAuthenticatedImage.ts` for Deletion

**Objective:** Remove the custom hook that is now made redundant by `expo-image`.

**File Path:** `src/hooks/useAuthenticatedImage.ts`

**Action:** This file should be deleted. Its functionality is now entirely handled by the `expo-image` component.

---

## 3. Approval

This plan is now ready for your review and approval. By leveraging `expo-image`, we can fix the scrolling performance issues and simplify our codebase.
