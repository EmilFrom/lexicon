import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import RenderHTML, { MixedStyleDeclaration, RenderersProps, TNode } from 'react-native-render-html';

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

  // Define base styles for HTML tags
  const tagsStyles: Readonly<Record<string, MixedStyleDeclaration>> = {
    body: { color: fontColor || colors.textNormal, fontSize: fontSizes.m },
    p: { marginTop: 0, marginBottom: 0 }, // Remove default paragraph margins
    blockquote: {
      backgroundColor: colors.border,
      padding: 10,
      borderRadius: 4,
      fontStyle: 'italic',
      color: colors.textLight,
    },
    strong: { fontWeight: 'bold' },
    em: { fontStyle: 'italic' },
    a: { color: colors.primary, textDecorationLine: 'none' }, // Style for links
  };

  // Custom renderer for <a> tags to handle both mentions and links
   const renderers = useMemo(() => ({
    a: ({ TDefaultRenderer, ...props }: any) => {
      const { href } = props.tnode.attributes;
      const isMention = props.tnode.classes.includes('mention');

      if (isMention && !nonClickable) {
        const username = props.tnode.children[0].data.substring(1);
        return (
          <Text
            style={styles.mention}
            onPress={() => navigate('UserInformation', { username })}
          >
            {props.tnode.children[0].data}
          </Text>
        );
      }

      const handlePress = () => {
        if (nonClickable) return;

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
    details: (rendererProps: RenderersProps) => {
      const { TDefaultRenderer, tnode } = rendererProps;
      
      const summaryNode = tnode.children.find(
        (c: TNode) => c.type === 'tag' && c.tagName === 'summary'
      );
      
      const title = summaryNode?.children[0]?.data || 'Details';

      const contentTNode = {
        ...tnode,
        children: tnode.children.filter((c: TNode) => c !== summaryNode),
      };

      return (
        <Collapsible title={title}>
          <TDefaultRenderer tnode={contentTNode} {...rendererProps} />
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