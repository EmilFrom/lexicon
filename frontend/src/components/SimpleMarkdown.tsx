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

// This component intentionally does not handle image rendering.
export type SimpleMarkdownProps = Omit<BaseMarkdownProps, 'rules' | 'style'> & {
  content: string;
  fontColor?: string;
  style?: StyleProp<ViewStyle>;
  mentionColor?: string;
  mentions?: Array<string>;
  nonClickable?: boolean;
};

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

  const renderMention = ({ key, content }: ASTNode) => (
    <Text
      key={key}
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
  );

  const renderLink = ({ key, attributes }: ASTNode) => {
      if (typeof attributes.href !== 'string') {
        return;
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
        <Text key={key} onPress={handleLinkPress} style={styles.link}>
          {url}
        </Text>
      );
    };

  // The 'rules' object here intentionally omits the 'image' rule.
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
  ({ colors, fontSizes, ... }) => ({
    // ...
  }),
);