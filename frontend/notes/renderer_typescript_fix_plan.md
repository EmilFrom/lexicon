# Plan to Fix TypeScript Errors in MarkdownRenderer.tsx

## 1. Analysis

All the reported TypeScript errors are located in `src/components/MarkdownRenderer.tsx` and stem from a mismatch between the component's code and the types expected by the `react-native-render-html` library.

The specific issues are:
1.  **Incorrect Type Import:** The code imports a type `TElement` which does not exist. The correct type for an HTML element node is `TElementNode`. This is the root cause of the other typing errors.
2.  **Implicit `any`:** Because the types are wrong, TypeScript cannot infer the type of child nodes in `tnode.children`, leading to `implicit 'any'` errors in array methods like `.find()` and `.filter()`.
3.  **Prop Overwriting:** The modified `tnode` for the collapsible content was being overwritten by the JSX spread operator due to incorrect ordering, which would cause a logical bug.

## 2. Plan

The plan is to replace the entire content of `src/components/MarkdownRenderer.tsx` with a corrected version that uses the proper types and logic as defined by the `react-native-render-html` library.

### Full, Corrected Code for `src/components/MarkdownRenderer.tsx`

This code will resolve all the reported errors.

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

## 3. Approval

This plan is now ready for your review and approval.
