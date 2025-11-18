import React, { useEffect, useState } from 'react';
import { View, ViewProps } from 'react-native';

import { ActivityIndicator, Divider, Icon } from '../core-ui';
import {
  deleteQuoteBbCode,
  formatRelativeTime,
  handleUnsupportedMarkdown,
  useStorage,
} from '../helpers';
import { getCompleteImageVideoUrls } from '../helpers/api/processRawContent'; // Keep this import
import { usePostRaw } from '../hooks';
import { Color, makeStyles, useTheme } from '../theme';
import { Post } from '../types';

import { Author } from './Author';
import { FullScreenImageModal } from './FullScreenImageModal'; // 1. FIX: Add missing import
import { ImageCarousel } from './ImageCarousel';
import { SimpleMarkdown } from './SimpleMarkdown';
import { Metrics } from './Metrics/Metrics';
import { PollPreview } from './Poll';
import { PostHidden } from './PostItem';
import {
  LocalRepliedPostProps,
  RepliedPost,
  RepliedPostProps,
} from './RepliedPost';

// ... (Props types remain the same)

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
    mentionedUsers,
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

  // 2. FIX: Add a null check for 'content' before processing.
  const images = content
    ? (getCompleteImageVideoUrls(content).filter(Boolean) as string[])
    : [];
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = content ? content.replace(imageTagRegex, '') : '';

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
    // ... (renderPolls function remains the same)
  };

  return (
    <View style={style} {...otherProps}>
      <View style={{ position: 'relative' }}>
        {/* ... (Author and RepliedPost sections remain the same) */}
        {isHidden ? (
          <PostHidden
            loading={loading}
            author={isTopicOwner}
            onPressViewIgnoredContent={onPressViewIgnoredContent}
          />
        ) : (
          <>
            {renderPolls()}
            <SimpleMarkdown
              content={
                replyToPostId
                  ? handleUnsupportedMarkdown(
                      deleteQuoteBbCode(contentWithoutImages),
                    )
                  : handleUnsupportedMarkdown(contentWithoutImages)
              }
              fontColor={colors[color]}
              mentions={mentionedUsers}
            />
            <ImageCarousel
              images={images || []}
              onImagePress={(uri) => setFullScreenImage(uri)}
            />
          </>
        )}
        {/* ... (Metrics and Loading sections remain the same) */}
      </View>
      <Divider />
      {/* 3. FIX: Add the missing FullScreenImageModal component */}
      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </View>
  );
}

export const NestedComment = React.memo(BaseNestedComment);

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
