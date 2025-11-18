# Final Implementation Plan for MarkdownRenderer.tsx

## 1. Objective

This document contains the final, approved implementation for `src/components/MarkdownRenderer.tsx`. The purpose of this update is to resolve all outstanding TypeScript errors related to incorrect type definitions and prop handling when interfacing with the `react-native-render-html` library.

## 2. Analysis Summary

The previous plan identified three core issues that this code resolves:
1.  **Incorrect Type Usage:** The code was importing and using a non-existent type `TElement` and was not correctly typing the parameters in custom renderers, leading to `any` type errors.
2.  **Faulty Type Guard:** The logic to find the `<summary>` node was using `c.type === 'tag'`, which is incorrect. The correct check is for `c.type === 'element'`.
3.  **Prop Overwriting:** The modified `tnode` in the `details` renderer was being overwritten due to incorrect ordering in the JSX spread operator.

## 3. Full and Final Code

As approved, the following code should replace the **entire contents** of the `src/components/MarkdownRenderer.tsx` file.

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
  TNode,
  isTElementNode,
  TElementNode,
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
    a: (props: CustomRendererProps<TNode>) => {
      const { TDefaultRenderer, tnode } = props;
      if (!isTElementNode(tnode)) {
        return <TDefaultRenderer {...props} />;
      }
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
    details: (props: CustomRendererProps<TNode>) => {
      const { TDefaultRenderer, tnode } = props;
      if (!isTElementNode(tnode)) {
        return <TDefaultRenderer {...props} />;
      }
      
      const summaryNode = tnode.children.find(
        (c): c is TElementNode => isTElementNode(c) && c.tagName === 'summary'
      );
      
      const title = summaryNode?.children[0]?.data || 'Details';

      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c) => c !== summaryNode),
      };

      return (
        <Collapsible title={title}>
          <TDefaultRenderer {...props} tnode={contentTNode} />
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

## 4. Next Steps

This plan is now documented. The next action would be to execute this file replacement.
