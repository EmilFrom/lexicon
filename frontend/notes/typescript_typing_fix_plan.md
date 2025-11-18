# Plan to Fix Advanced TypeScript Type Errors in MarkdownRenderer

## 1. Analysis of the Errors

The errors you've provided are all located in `MarkdownRenderer.tsx` and relate to incorrect typings when creating a custom renderer for the `react-native-render-html` library. Let's break them down.

### Error Cluster 1: Incorrect Node Type Check (Lines 87-88)

*   **Error Messages:**
    1.  `This comparison appears to be unintentional because the types '...' and '"tag"' have no overlap.`
    2.  `Property 'tagName' does not exist on type 'never'.`
*   **Problematic Code:** `tnode.children.find((c: TNode) => c.type === 'tag' && c.tagName === 'summary')`
*   **Analysis:** This is a classic type-narrowing failure. The `TNode` type from the library is a union of different kinds of nodes (text nodes, element nodes, etc.). Our code is trying to find a child node that is an HTML element (a tag). We are checking `c.type === 'tag'`. However, according to the `react-native-render-html` type definitions, the `type` property for an element node is the string `'element'`, not `'tag'`.
*   **Consequence:** Because TypeScript sees that no node in the `TNode` union has a `type` of `'tag'`, it concludes that the condition can never be met. The type of `c` inside the `find` function is therefore narrowed to `never`, meaning it's an impossible type. When we then try to access `c.tagName`, TypeScript correctly complains that you can't get the `tagName` of `never`.

### Error Cluster 2: Incorrect Renderer Function Signature (Line 112)

*   **Error Message:** `Type '{ a: ..., details: ..., img: ... }' is not assignable to type 'CustomTagRendererRecord'.`
*   **Analysis:** This error is more complex but points to a single root cause: the function signature for our custom `details` renderer is incorrect.
*   **Problematic Code:** `details: (rendererProps: RenderersProps) => { ... }`
*   **Consequence:** We have typed the incoming properties as `RenderersProps`. This type is too broad and doesn't match what `react-native-render-html` actually provides to a *single* renderer function. The library expects a function that accepts a more specific props object, typically `CustomRendererProps`. Because our function signature doesn't match the library's expectation, TypeScript flags the entire `renderers` object as invalid. The `any` type used in the `a` renderer was hiding this problem, but correctly typing the `details` renderer has exposed it.

## 2. The Solution: Use Correct Types from the Library

The solution is to align our code with the precise type definitions provided by `react-native-render-html`.

1.  We will change the node type check from `'tag'` to `'element'`.
2.  We will use the correct `CustomRendererProps` type for the `details` renderer's function signature.
3.  For best practice, we will also properly type the `a` renderer instead of using `any`.

This will satisfy the TypeScript compiler and ensure our custom renderers are robust and correctly implemented according to the library's API.

### The Full, Corrected Code for `MarkdownRenderer.tsx`

Here is the complete and final version of the file with all type errors resolved. This code should replace the entire content of `src/components/MarkdownRenderer.tsx`.

**File Path:** `src/components/MarkdownRenderer.tsx`

**Full Code:**
```typescript
import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import RenderHTML, {
  CustomRendererProps,
  MixedStyleDeclaration,
  TDefaultRenderer,
  TElement,
} from 'react-native-render-html';

import { discourseHost } from '../constants';
import { Text } from '../core-ui/Text';
import { getValidDetailParams, extractPathname } from '../helpers';
import { makeStyles, useTheme } from '../theme';
import { StackNavProp } from '../types';
import { Collapsible } from './Collapsible';

type Props = {
  content: string;
  fontColor?: string;
  style?: StyleProp<ViewStyle>;
  nonClickable?: boolean;
};

export function MarkdownRenderer({ content, fontColor, style, nonClickable }: Props) {
  const { navigate, push } = useNavigation<StackNavProp<'UserInformation'>>();
  const { colors, fontSizes } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useStyles();

  const tagsStyles: Readonly<Record<string, MixedStyleDeclaration>> = {
    body: { color: fontColor || colors.textNormal, fontSize: fontSizes.m },
    p: { marginTop: 0, marginBottom: 0 },
    blockquote: {
      backgroundColor: colors.border,
      padding: 10,
      borderRadius: 4,
      fontStyle: 'italic',
      color: colors.textLight,
    },
    strong: { fontWeight: 'bold' },
    em: { fontStyle: 'italic' },
    a: { color: colors.primary, textDecorationLine: 'none' },
  };

  const renderers = useMemo(() => ({
    a: (props: CustomRendererProps<TElement>) => {
      const { TDefaultRenderer, tnode } = props;
      const { href } = tnode.attributes;
      const isMention = tnode.classes.includes('mention');

      if (isMention && !nonClickable) {
        const username = tnode.children[0].data.substring(1);
        return (
          <Text
            style={styles.mention}
            onPress={() => navigate('UserInformation', { username })}
          >
            {tnode.children[0].data}
          </Text>
        );
      }

      const handlePress = () => {
        if (nonClickable) return;
        if (!href) return;

        const isSameHost = href.startsWith(discourseHost);
        const pathname = isSameHost ? extractPathname(href) : '';

        if (isSameHost && pathname) {
          const detailParams = getValidDetailParams(pathname.split('/'));
          if (detailParams) {
            push('PostDetail', { topicId: detailParams.topicId, postNumber: detailParams.postNumber });
            return;
          }
        }
        Linking.openURL(href);
      };

      return (
        <Text style={styles.link} onPress={handlePress}>
          <TDefaultRenderer {...props} />
        </Text>
      );
    },
    details: (props: CustomRendererProps<TElement>) => {
      const { TDefaultRenderer, tnode } = props;
      
      // FIX: Check for node type 'element' instead of 'tag'
      const summaryNode = tnode.children.find(
        (c): c is TElement => c.type === 'element' && c.tagName === 'summary'
      );
      
      const title = summaryNode?.children[0]?.data || 'Details';

      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c) => c !== summaryNode),
      };

      return (
        <Collapsible title={title}>
          <TDefaultRenderer tnode={contentTNode} {...props} />
        </Collapsible>
      );
    },
    img: () => null,
  }), [nonClickable, navigate, push, styles.mention, styles.link]);

  return (
    <View style={style}>
      <RenderHTML
        contentWidth={width}
        source={{ html: content }}
        tagsStyles={tagsStyles}
        renderers={renderers}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  mention: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
}));
```
