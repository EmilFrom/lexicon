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