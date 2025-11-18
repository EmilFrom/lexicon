import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import RenderHTML, { MixedStyleDeclaration, TNode } from 'react-native-render-html';

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
    a: ({ TDefaultRenderer, tnode, ...props }: any) => {
      const { href } = tnode.attributes;
      const isMention = tnode.classes.includes('mention');

      if (isMention && !nonClickable) {
        // Safely access the text data
        const firstChild = tnode.children[0];
        const mentionText = firstChild && firstChild.type === 'text' ? firstChild.data : '';
        const username = mentionText.substring(1);
        return (
          <Text
            style={styles.mention}
            onPress={() => navigate('UserInformation', { username })}
          >
            {mentionText}
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
          <TDefaultRenderer tnode={tnode} {...props} />
        </Text>
      );
    },
    details: ({ TDefaultRenderer, tnode, ...props }: any) => {
      const summaryNode = tnode.children.find(
        // FIX: Use 'tagName' in c as the type guard
        (c: TNode) => 'tagName' in c && c.tagName === 'summary'
      );
      
      let title = 'Details';
      if (summaryNode && summaryNode.children[0] && summaryNode.children[0].type === 'text') {
        title = summaryNode.children[0].data;
      }

      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c: TNode) => c !== summaryNode),
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