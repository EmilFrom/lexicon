import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { TouchableOpacity, View, ViewProps, Pressable } from 'react-native';

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
import { ImageDimension } from '../../helpers/api/lexicon';
import { useImageDimensions } from '../../hooks/useImageDimensions';

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
  images?: Array<string>;
  imageDimensions?: { width: number; height: number; aspectRatio?: number };
  imageDimensionsMap?: Record<string, ImageDimension>;
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
};

function BasePostItem(props: Props) {
  const { navigate } = useNavigation<StackNavProp<'TabNav'>>();
  const storage = useStorage();
  const styles = useStyles();
  const { colors } = useTheme();
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
    // --- FIX: Removed showImageRow and imageDimensionsMap ---
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
    images: propImages,
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

  const htmlContent = React.useMemo(() => markdownToHtml(content), [content]);

  const images = React.useMemo(() => {
    return (
      propImages ??
      ((getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[]) ||
        [])
    );
  }, [propImages, htmlContent]);

  const { dimensions: fetchedDimensions } = useImageDimensions(images);

  const finalDimensionsMap = React.useMemo(() => {
    const combined: Record<string, ImageDimension> = {};

    const normalizeUrl = (u: string) =>
      u.replace(/_\d+_\d+x\d+(?=\.[a-zA-Z]+$)/, '');

    const normalizedLookup: Record<string, ImageDimension> = {};
    Object.values(fetchedDimensions).forEach((dim) => {
      if (dim && dim.url) {
        normalizedLookup[normalizeUrl(dim.url)] = dim;
      }
    });

    images.forEach((imgUrl) => {
      if (fetchedDimensions[imgUrl]) {
        combined[imgUrl] = fetchedDimensions[imgUrl];
      } else {
        const norm = normalizeUrl(imgUrl);
        if (normalizedLookup[norm]) {
          combined[imgUrl] = normalizedLookup[norm];
        }
      }
    });

    if (images.length > 0 && imageDimensions && !combined[images[0]]) {
      combined[images[0]] = {
        url: images[0],
        ...imageDimensions,
        aspectRatio:
          imageDimensions.aspectRatio ||
          imageDimensions.width / imageDimensions.height,
      };
    }
    return combined;
  }, [fetchedDimensions, imageDimensions, images]);

  if (__DEV__) {
    const firstImg = images[0];
    const hasData =
      finalDimensionsMap && Object.keys(finalDimensionsMap).length > 0;
    const hasMatch = finalDimensionsMap && finalDimensionsMap[firstImg];

    if (images.length > 0) {
      if (!hasData) {
        // waiting
      } else if (!hasMatch) {
        console.warn('[PostItem] Data loaded, but KEY MISMATCH.', {
          lookingFor: firstImg,
          availableKeys: Object.keys(finalDimensionsMap),
        });
      } else {
        console.log(
          '[PostItem] Success! Dimension found for:',
          firstImg,
          finalDimensionsMap[firstImg],
        );
      }
    }
  }

  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');

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
    <View style={{ minHeight: images.length ? 20 : 0 }}>
      <ImageCarousel
        images={images}
        onImagePress={(uri) => setFullScreenImage(uri)}
        imageDimensionsMap={finalDimensionsMap}
      />
    </View>
  );

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
      <Pressable
        onPress={onPressPost}
        style={styles.viewPostButton}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
      >
        <Text style={styles.viewPostButtonText} variant="bold">
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
      {imageContent}
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
    backgroundColor: colors.primary,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xxl,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  viewPostButtonText: {
    color: colors.background,
    fontSize: fontSizes.m,
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
