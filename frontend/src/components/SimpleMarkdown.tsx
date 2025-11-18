import { useNavigation } from '@react-navigation/core';
import * as Linking from 'expo-linking';
import mentionFlowDock from 'markdown-it-flowdock';
import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import BaseMarkdown, {
  ASTNode,
  MarkdownIt,
  MarkdownProps as BaseMarkdownProps,
  RenderRules,
} from 'react-native-markdown-display';

import { discourseHost } from '../constants';
import { Text } from '../core-ui/Text';
import {
  extractPathname,
  filterMarkdownContentPoll,
  getValidDetailParams,
} from '../helpers';
import { makeStyles } from '../theme';
import { StackNavProp } from '../types';

export type SimpleMarkdownProps = Omit<BaseMarkdownProps, 'rules' | 'style'> & {
  content: string;
  fontColor?: string;
  style?: StyleProp<ViewStyle>;
  mentionColor?: string;
  mentions?: Array<string>;
  nonClickable?: boolean;
};

const ios = Platform.OS === 'ios';

export function SimpleMarkdown(props: SimpleMarkdownProps) {
  const { navigate, push } = useNavigation<StackNavProp<'UserInformation'>>();
  const baseStyles = useStyles();

  const {
    content,
    fontColor,
    mentionColor,
    style,
    nonClickable,
    ...otherProps
  } = props;

  const filteredContent = filterMarkdownContentPoll(content).filteredMarkdown;
  const styles = fontColor
    ? { ...baseStyles, body: { ...baseStyles.body, color: fontColor } }
    : baseStyles;
  const markdownItInstance = MarkdownIt({ typographer: true }).use(
    mentionFlowDock,
    { containerClassName: 'mention' },
  );

  const onPressMention = (username: string) => {
    navigate('UserInformation', { username });
  };

  // FIX: Apply key to a wrapper View, not the custom component
  const renderMention = ({ key, content }: ASTNode) => (
    <View key={key}>
      <Text
        variant="bold"
        style={mentionColor === 'primary' ? baseStyles.mentionByMe : baseStyles.mention}
        onPress={() => {
          if (!nonClickable) {
            onPressMention(content);
          }
        }}
      >
        {`@${content}`}
      </Text>
    </View>
  );

  // FIX: Apply key to a wrapper View, not the custom component
  const renderLink = ({ key, attributes }: ASTNode) => {
    if (typeof attributes.href !== 'string') {
      return null;
    }
    let url = attributes.href;
    const isSameHost = url.startsWith(discourseHost);
    const pathname = isSameHost ? extractPathname(url) : '';
    if (isSameHost && pathname) {
      url = `/${pathname.replace(/t\//, 'topics/')}`;
    }
    const onLinkPress = () => {
      const detailParams = getValidDetailParams(pathname.split('/'));
      if (!detailParams) {
        Linking.openURL(url);
        return;
      }
      const { topicId, postNumber } = detailParams;
      push('PostDetail', { topicId, postNumber });
    };
    const handleLinkPress = () => {
      if (!isSameHost || !pathname) {
        Linking.openURL(url);
        return;
      }
      onLinkPress();
    };
    return (
      <View key={key}>
        <Text onPress={handleLinkPress} style={styles.link}>
          {url}
        </Text>
      </View>
    );
  };

  const rules: RenderRules = {
    mention: renderMention,
    link: renderLink,
  };

  return (
    <View style={style}>
      <BaseMarkdown
        markdownit={markdownItInstance}
        rules={rules}
        style={styles}
        {...otherProps}
      >
        {filteredContent}
      </BaseMarkdown>
    </View>
  );
}
// Copy the entire useStyles hook from Markdown.tsx, but you can remove the 'image' style
// if it's not used elsewhere. For safety, you can leave it.
const useStyles = makeStyles(
  ({ colors, fontSizes, headingFontSizes, spacing }) => ({
    body: {
      fontSize: fontSizes.m,
      margin: 0,
      padding: 0,
      color: colors.textNormal,
    },
    heading1: { fontSize: headingFontSizes.h1, paddingVertical: spacing.m },
    heading2: { fontSize: headingFontSizes.h2, paddingVertical: spacing.m },
    heading3: { fontSize: headingFontSizes.h3, paddingVertical: spacing.m },
    heading4: { fontSize: headingFontSizes.h4, paddingVertical: spacing.m },
    heading5: { fontSize: headingFontSizes.h5, paddingVertical: spacing.m },
    heading6: { fontSize: headingFontSizes.h6, paddingVertical: spacing.m },
    hr: { backgroundColor: colors.border, marginVertical: spacing.m },
    table: { borderColor: colors.border },
    tr: { borderColor: colors.border },
    paragraph: {
      marginTop: 0,
      marginBottom: spacing.m,
    },
    // 3. FIX: The definitive style override for image containers.
    // This forces the container to be a block element AND centers the image inside it.
    bullet_list_icon: {
      flex: 1,
      fontSize: ios ? 52 : 28,
      lineHeight: ios ? 36 : 24,
      textAlign: 'right',
      marginLeft: 0,
    },
    ordered_list_icon: {
      flex: 1,
      fontSize: fontSizes.m,
      lineHeight: ios ? 0 : 16,
      textAlign: 'right',
      marginLeft: 0,
    },
    bullet_list_content: { flex: 8 },
    ordered_list_content: { flex: 8 },
    blockquote: {
      color: colors.textNormal,
      backgroundColor: colors.border,
      paddingHorizontal: spacing.l,
      paddingTop: spacing.l,
      marginBottom: spacing.l,
    },
    code_inline: {
      color: colors.textNormal,
      backgroundColor: colors.border,
    },
    code_block: {
      color: colors.textNormal,
      borderColor: colors.grey,
      backgroundColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.m,
      borderRadius: 4,
    },
    fence: {
      color: colors.textNormal,
      borderColor: colors.grey,
      backgroundColor: colors.border,
      padding: spacing.xl,
      marginBottom: spacing.m,
      borderRadius: 8,
    },
    mentionByMe: {
      color: colors.pureWhite,
    },
    mention: {
      color: colors.primary,
    },
    emojiImage: {
      width: 20,
      height: 20,
    },
    link: { textDecorationLine: 'underline' },
  }),
);