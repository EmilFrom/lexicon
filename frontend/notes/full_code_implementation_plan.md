# Full Code Implementation Plan

This document contains the complete, final code for every new and modified file required to fix the performance warnings and image rendering bugs.

---

## 1. New Helper File: `markdownToHtml.ts`

This is a new file that provides a reusable function to convert Markdown text into HTML.

**File Path:** `src/helpers/markdownToHtml.ts`

**Full Code:**
```typescript
import MarkdownIt from 'markdown-it';

// Initialize the parser once and reuse it for better performance.
const md = new MarkdownIt();

/**
 * Converts a Markdown string to an HTML string.
 * @param markdown The raw Markdown content.
 * @returns An HTML string.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return md.render(markdown);
}
```

---

## 2. Modified Component: `MarkdownRenderer.tsx`

This file is updated to use the `useMemo` hook for performance optimization. This prevents the `renderers` object from being recreated on every render, which was causing the performance warnings.

**File Path:** `src/components/MarkdownRenderer.tsx`

**Full Code:**
```typescript
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
```

---

## 3. Modified Component: `PostItem/PostItem.tsx`

This file is updated to implement the new content processing pattern. It now converts Markdown to HTML, then extracts images, and passes the clean HTML to the renderer and the image URLs to the carousel.

**File Path:** `src/components/PostItem/PostItem.tsx`

**Full Code:**
```typescript
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  ViewProps,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { Icon, Text } from '../../core-ui';
import { FullScreenImageModal } from '../FullScreenImageModal';
import {
  formatRelativeTime,
  replaceTagsInContent,
  unescapeHTML,
  useStorage,
} from '../../helpers';
import { markdownToHtml } from '../../helpers/markdownToHtml';
import { getCompleteImageVideoUrls } from '../../helpers/api/processRawContent';
import { Color, makeStyles, useTheme } from '../../theme';
import { Channel, Poll, PollsVotes, StackNavProp } from '../../types';
import { Author } from '../Author';
import { PollPreview } from '../Poll';

import { PostGroupings } from './PostGroupings';
import { PostHidden } from './PostHidden';
import { ImageCarousel } from '../ImageCarousel';
import { MarkdownRenderer } from '../MarkdownRenderer';

type Props = ViewProps & {
  topicId: number;
  title: string;
  content: string;
  username: string;
  avatar: string;
  channel: Channel;
  createdAt: string;
  isLiked: boolean;
  tags?: Array<string>;
  hidden?: boolean;
  showLabel?: boolean;
  currentUser?: string;
  showImageRow?: boolean;
  nonclickable?: boolean;
  prevScreen?: string;
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
  isHidden?: boolean;
  footer?: React.ReactNode;
  onPressViewIgnoredContent?: () => void;
  showStatus?: boolean;
  emojiCode?: string;
  polls?: Array<Poll>;
  pollsVotes?: Array<PollsVotes>;
  postId?: number;
  testIDStatus?: string;
  pinned?: boolean;
};

function BasePostItem(props: Props) {
  const { navigate } = useNavigation<StackNavProp<'TabNav'>>();
  const storage = useStorage();
  const styles = useStyles();
  const { colors } = useTheme();
  const [fullScreenImage, setFullScreenImage] = React.useState<string | null>(null);

  const {
    topicId,
    title,
    username,
    avatar,
    channel,
    createdAt,
    isLiked,
    tags,
    hidden,
    showLabel,
    currentUser,
    prevScreen,
    content,
    style,
    showImageRow = false,
    nonclickable = false,
    imageDimensions,
    isHidden = false,
    footer,
    onPressViewIgnoredContent = () => {},
    showStatus,
    emojiCode,
    polls,
    pollsVotes,
    postId,
    testIDStatus,
    pinned,
    ...otherProps
  } = props;

  const time =
    createdAt === ''
      ? t('Loading...')
      : (prevScreen === 'Home' ? t('Last Activity ') : '') +
        formatRelativeTime(createdAt);

  const isCreator = username === storage.getItem('user')?.username;
  const color: Color = hidden ? 'textLight' : 'textNormal';

  const onPressPost = () => {
    navigate('PostDetail', {
      topicId,
      prevScreen,
      focusedPostNumber: undefined,
      hidden: isHidden,
    });
  };

  const onPressAuthor = useCallback(
    (username: string) => {
      navigate('UserInformation', { username });
    },
    [navigate],
  );

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  const contentTitle = (
    <Text style={[styles.spacingBottom, styles.flex]} variant="semiBold" size="l">
      {title}
    </Text>
  );

  const author = (
    <Author
      image={avatar}
      title={username}
      subtitle={time}
      style={styles.spacingBottom}
      subtitleStyle={styles.textTime}
      onPressAuthor={onPressAuthor}
      onPressEmptySpaceInPost={onPressPost}
      showStatus={showStatus}
      emojiCode={emojiCode}
      testIDStatus={testIDStatus}
    />
  );

  const renderPolls = () => {
    if (!polls) {
      return null;
    }
    return polls?.map((poll, index) => {
      const pollVotes = pollsVotes?.find(
        (pollVotes) => pollVotes.pollName === poll.name,
      );
      return (
        <PollPreview
          key={index}
          poll={poll}
          pollVotes={pollVotes?.pollOptionIds}
          isCreator={isCreator}
          postId={postId}
          topicId={topicId}
          postCreatedAt={createdAt}
        />
      );
    });
  };

  const previewContainerStyle =
    prevScreen === 'Home' ? styles.contentPreview : undefined;

  const mainContent = (
    <>
      {nonclickable && <PostGroupings channel={channel} tags={tags} />}
      {isHidden ? (
        <PostHidden
          style={styles.markdown}
          author={isCreator}
          numberOfLines={3}
          onPressViewIgnoredContent={onPressViewIgnoredContent}
        />
      ) : (
        <View style={previewContainerStyle}>
          <MarkdownRenderer
            content={replaceTagsInContent(unescapeHTML(contentWithoutImages))}
            style={styles.markdown}
            fontColor={colors[color]}
          />
        </View>
      )}
    </>
  );

  const imageContent = (
    <ImageCarousel
      images={images}
      onImagePress={(uri) => setFullScreenImage(uri)}
      serverDimensions={imageDimensions}
    />
  );
  const pollsContent = renderPolls();

  const wrappedMainContent = !nonclickable ? (
    <>
      {showLabel && isLiked && (
        <View>
          <Text style={styles.label} variant="bold" color="primary" numberOfLines={3}>
            {currentUser === storage.getItem('user')?.username
              ? t(`You liked this post`)
              : t(`{currentUser} liked this post`, { currentUser })}
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={onPressPost}
        delayPressIn={200}
        style={styles.contentTitle}
      >
        {contentTitle}
        {pinned && <Icon name="Pin" style={styles.pinned} />}
      </TouchableOpacity>
      <View style={styles.header}>
        <Author
          image={avatar}
          title={username}
          subtitle={time}
          style={styles.author}
          subtitleStyle={styles.textTime}
          onPressAuthor={onPressAuthor}
          onPressEmptySpaceInPost={onPressPost}
          showStatus={showStatus}
          emojiCode={emojiCode}
          testIDStatus={testIDStatus}
        />
        <PostGroupings channel={channel} tags={tags} style={styles.groupings} />
      </View>
      <TouchableOpacity onPress={onPressPost} delayPressIn={200}>
        {mainContent}
      </TouchableOpacity>
      {pollsContent}
      {imageContent}
      <Pressable onPress={onPressPost} style={styles.viewPostButton}>
        <Text color="primary" variant="bold">
          {t('View Post')}
        </Text>
      </Pressable>
    </>
  ) : (
    <>
      {contentTitle}
      {author}
      {mainContent}
      {pollsContent}
    </>
  );

  return (
    <>
      <View
        style={[styles.container, pinned && styles.pinnedBorder, style]}
        {...otherProps}
      >
        {wrappedMainContent}
        {footer}
      </View>
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </>
  );
}

const useStyles = makeStyles(({ colors, fontSizes, shadow, spacing }) => ({
  flex: { flex: 1 },
  container: {
    justifyContent: 'flex-start',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  author: {
    flex: 1,
  },
  groupings: {
    marginLeft: 'auto',
  },
  markdown: {
    marginTop: spacing.xl,
  },
  contentPreview: {
    overflow: 'hidden',
  },
  label: {
    marginBottom: spacing.l,
    textTransform: 'capitalize',
  },
  spacingBottom: {
    marginBottom: spacing.xl,
  },
  textTime: {
    fontSize: fontSizes.s,
  },
  contentTitle: { flexDirection: 'row', justifyContent: 'space-between' },
  pinned: { marginLeft: spacing.s },
  pinnedBorder: { borderLeftWidth: 4, borderColor: colors.primary },
  viewPostButton: {
    marginTop: spacing.l,
    alignSelf: 'flex-start',
  },
}));

const areEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.topicId === nextProps.topicId &&
    prevProps.title === nextProps.title &&
    prevProps.content === nextProps.content &&
    prevProps.username === nextProps.username &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.hidden === nextProps.hidden &&
    prevProps.isHidden === nextProps.isHidden &&
    prevProps.prevScreen === nextProps.prevScreen &&
    prevProps.pinned === nextProps.pinned &&
    prevProps.tags?.length === nextProps.tags?.length &&
    prevProps.polls?.length === nextProps.polls?.length
  );
};

const PostItem = React.memo(BasePostItem, areEqual);
export { PostItem, Props as PostItemProps };
```

---

## 4. Modified Component: `NestedComment.tsx`

This file is also updated to implement the new content processing pattern, ensuring that any images in comments are correctly extracted and displayed.

**File Path:** `src/components/NestedComment.tsx`

**Full Code:**
```typescript
import { useNavigation } from '@react-navigation/native';
import React, { memo, useEffect, useState } from 'react';
import { View, ViewProps } from 'react-native';

import {
  deleteQuoteBbCode,
  formatRelativeTime,
  handleUnsupportedMarkdown,
  useStorage,
} from '../helpers';
import { markdownToHtml } from '../helpers/markdownToHtml';
import { getCompleteImageVideoUrls } from '../helpers/api/processRawContent';
import { usePostRaw } from '../hooks';
import { Color, makeStyles, useTheme } from '../theme';
import { Post, RootStackNavProp } from '../types';

import { ActivityIndicator, Divider, Icon } from '../core-ui';
import { Author } from './Author';
import { FullScreenImageModal } from './FullScreenImageModal';
import { ImageCarousel } from './ImageCarousel';
import { Metrics } from './Metrics/Metrics';
import { PollPreview } from './Poll';
import { PostHidden } from './PostItem';
import { RepliedPost } from './RepliedPost';
import { MarkdownRenderer } from './MarkdownRenderer';

type PressReplyParams = {
  replyToPostId?: number;
};

type PressMoreParams = {
  id: number;
  canFlag?: boolean;
  canEdit?: boolean;
  flaggedByCommunity?: boolean;
  fromPost: boolean;
  author: string;
};

type Props = ViewProps &
  Pick<
    Post,
    | 'id'
    | 'topicId'
    | 'likeCount'
    | 'replyCount'
    | 'isLiked'
    | 'username'
    | 'createdAt'
    | 'avatar'
    | 'canFlag'
    | 'canEdit'
    | 'content'
    | 'hidden'
    | 'postNumber'
    | 'replyToPostNumber'
    | 'emojiStatus'
    | 'polls'
    | 'pollsVotes'
  > & {
    hasMetrics?: boolean;
    showOptions?: boolean;
    isLoading?: boolean;
    replyToPostId?: number;
    onPressReply?: (params: PressReplyParams) => void;
    onPressMore?: (params: PressMoreParams) => void;
    onPressAuthor?: (username: string) => void;
    onLayout?: () => void;
    testIDStatus?: string;
  };

function BaseNestedComment(props: Props) {
  const storage = useStorage();
  const styles = useStyles();
  const { colors } = useTheme();

  const {
    id,
    topicId,
    likeCount,
    replyCount,
    isLiked,
    username,
    createdAt,
    avatar,
    canFlag,
    canEdit,
    content: contentFromGetTopicDetail,
    hidden,
    hasMetrics = true,
    style,
    showOptions,
    isLoading = false,
    replyToPostId,
    onPressReply,
    onPressMore,
    onPressAuthor,
    onLayout,
    emojiStatus,
    polls,
    pollsVotes,
    testIDStatus,
    ...otherProps
  } = props;

  const [content, setContent] = useState(contentFromGetTopicDetail);
  const [isHidden, setHidden] = useState(hidden ?? false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const isTopicOwner = username === storage.getItem('user')?.username;
  const time = formatRelativeTime(createdAt);
  const color: Color = hidden ? 'textLight' : 'textNormal';

  const { postRaw, loading } = usePostRaw({
    onCompleted: ({ postRaw: { cooked } }) => {
      setContent(cooked.markdownContent);
      setHidden(false);
    },
  });

  // --- NEW CONTENT PROCESSING PATTERN ---
  const htmlContent = markdownToHtml(content);
  const images = getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[] || [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  // --- END OF PATTERN ---

  useEffect(() => {
    if (onLayout) {
      onLayout();
    }
  }, [id, onLayout]);

  const onPressViewIgnoredContent = () => {
    if (content === '') {
      postRaw({ variables: { postId: id } });
    } else {
      setHidden(false);
    }
  };

  const renderPolls = () => {
    if (!polls) {
      return null;
    }
    return polls?.map((poll, index) => {
      const pollVotes = pollsVotes?.find(
        (pollVotes) => pollVotes.pollName === poll.name,
      );
      return (
        <PollPreview
          key={index}
          poll={poll}
          pollVotes={pollVotes?.pollOptionIds}
          isCreator={isTopicOwner}
          postId={id}
          topicId={topicId}
          postCreatedAt={createdAt}
        />
      );
    });
  };

  return (
    <View style={style} {...otherProps}>
      <View style={{ position: 'relative' }}>
        <View style={styles.authorContainer}>
          <Author
            image={avatar}
            title={username}
            subtitle={time}
            style={styles.author}
            subtitleStyle={styles.textTime}
            onPressAuthor={onPressAuthor}
            showStatus={true}
            emojiCode={emojiStatus}
            testIDStatus={testIDStatus}
          >
            {showOptions && (
              <Icon
                name="More"
                color={colors.textLighter}
                onPress={() =>
                  onPressMore?.({
                    id,
                    canFlag,
                    canEdit,
                    flaggedByCommunity: hidden,
                    fromPost: false,
                    author: username,
                  })
                }
                hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                testID={`NestedComment:Icon:More:${id}`}
              />
            )}
          </Author>
        </View>
        {replyToPostId && <RepliedPost postId={id} replyToPostId={replyToPostId} />}
        {isHidden ? (
          <PostHidden
            loading={loading}
            author={isTopicOwner}
            onPressViewIgnoredContent={onPressViewIgnoredContent}
          />
        ) : (
          <>
            {renderPolls()}
            <MarkdownRenderer
              content={
                replyToPostId
                  ? handleUnsupportedMarkdown(
                      deleteQuoteBbCode(contentWithoutImages),
                    )
                  : handleUnsupportedMarkdown(contentWithoutImages)
              }
              fontColor={colors[color]}
            />
            <ImageCarousel
              images={images}
              onImagePress={(uri) => setFullScreenImage(uri)}
            />
          </>
        )}
        {hasMetrics && !isHidden && (
          <Metrics
            topicId={topicId}
            postId={id}
            replyCount={replyCount}
            likeCount={likeCount}
            isLiked={isLiked}
            isCreator={isTopicOwner}
            style={styles.metricSpacing}
            onPressReply={({ postId }) => onPressReply?.({ replyToPostId: postId })}
          />
        )}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        )}
      </View>
      <Divider />
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </View>
  );
}

const useStyles = makeStyles(({ fontSizes, spacing, colors }) => ({
  authorContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  author: {
    paddingVertical: spacing.xl,
  },
  loadingContainer: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDarker,
  },
  metricSpacing: {
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
  },
  textTime: {
    fontSize: fontSizes.s,
  },
}));

export const NestedComment = memo(BaseNestedComment);
```
