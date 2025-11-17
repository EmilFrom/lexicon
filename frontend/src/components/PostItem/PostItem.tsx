import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  ViewProps,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { NO_EXCERPT_WORDING } from '../../constants';
import { AuthenticatedImage, Icon, Text } from '../../core-ui';
import { FullScreenImageModal } from '../FullScreenImageModal';
import {
  formatRelativeTime,
  replaceTagsInContent,
  unescapeHTML,
  useStorage,
} from '../../helpers';
import { Color, makeStyles, useTheme } from '../../theme';
import { Channel, Poll, PollsVotes, StackNavProp } from '../../types';
import { Author } from '../Author';
import { MarkdownContent } from '../MarkdownContent';
import { PollPreview } from '../Poll';

import { PostGroupings } from './PostGroupings';
import { PostHidden } from './PostHidden';

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
  images?: Array<string>;
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
  isHidden?: boolean;
  footer?: React.ReactNode;
  mentionedUsers?: Array<string>;
  onPressViewIgnoredContent?: () => void;
  showStatus?: boolean;
  emojiCode?: string;
  polls?: Array<Poll>;
  pollsVotes?: Array<PollsVotes>;
  postId?: number;
  testIDStatus?: string;
  pinned?: boolean;
  onImagePress?: (uri: string) => void;
};

function BasePostItem(props: Props) {
  //console.log('--- Props received by BasePostItem ---', props);

  const { navigate } = useNavigation<StackNavProp<'TabNav'>>();
  const storage = useStorage();
  const styles = useStyles();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [fullScreenImage, setFullScreenImage] = React.useState<string | null>(
    null,
  );

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
    images,
    imageDimensions,
    mentionedUsers,
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
    onImagePress,
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

  const contentTitle = (
    <Text
      style={[styles.spacingBottom, styles.flex]}
      variant="semiBold"
      size="l"
    >
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
          <MarkdownContent
            content={replaceTagsInContent(unescapeHTML(content))}
            style={styles.markdown}
            fontColor={colors[color]}
            mentions={mentionedUsers}
            onImagePress={onImagePress}
          />
        </View>
      )}
    </>
  );

  const imageContent =
    showImageRow && images && images.length > 0 ? (
      <View style={styles.imageWrapper}>
        <AuthenticatedImage
          url={images[0]}
          testID={`PostItem:${topicId}`}
          onPress={(uri) => setFullScreenImage(uri)}
          maxHeightRatio={0.5}
          serverDimensions={imageDimensions}
        />
        {images.length > 1 && (
          <View style={styles.imageCountBadge}>
            <Text style={styles.imageCountText}>+{images.length - 1} more</Text>
          </View>
        )}
      </View>
    ) : null;
  const pollsContent = renderPolls();

  const wrappedMainContent = !nonclickable ? (
    <>
      {showLabel && isLiked && (
        <View>
          <Text
            style={styles.label}
            variant="bold"
            color="primary"
            numberOfLines={3}
          >
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
  imageWrapper: {
    marginVertical: spacing.m,
    borderRadius: spacing.m,
    overflow: 'hidden',
    position: 'relative',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: spacing.m,
    right: spacing.m,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: spacing.s,
  },
  imageCountText: {
    color: colors.pureWhite,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  spacingBottom: {
    marginBottom: spacing.xl,
  },
  text: {
    marginTop: spacing.xl,
    marginBottom: spacing.m,
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

// Custom comparison function for React.memo
// Compare key props that affect rendering
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
    // Compare arrays by length and content
    prevProps.tags?.length === nextProps.tags?.length &&
    prevProps.images?.length === nextProps.images?.length &&
    prevProps.polls?.length === nextProps.polls?.length
  );
};

const PostItem = React.memo(BasePostItem, areEqual);
export { PostItem, Props as PostItemProps };
