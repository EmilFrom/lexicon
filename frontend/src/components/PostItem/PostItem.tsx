import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  TouchableOpacity,
  View,
  ViewProps,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { NO_EXCERPT_WORDING } from '../../constants';
import { CustomImage, Icon, Text } from '../../core-ui';
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
  //console.log('--- Props received by BasePostItem ---', props);

  const { navigate } = useNavigation<StackNavProp<'TabNav'>>();
  const storage = useStorage();
  const styles = useStyles();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);

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

  const previewHeightLimit =
    prevScreen === 'Home'
      ? Math.min(
          windowHeight * 0.45,
          containerHeight ? containerHeight * 0.6 : windowHeight * 0.45,
        )
      : undefined;

  const previewContainerStyle =
    prevScreen === 'Home'
      ? [styles.contentPreview, { maxHeight: previewHeightLimit }]
      : undefined;

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
          />
        </View>
      )}
    </>
  );

  const imageContent = images && images.length > 0 && (
    <CustomImage src={images[0]} style={styles.images} />
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
        <PostGroupings
          channel={channel}
          tags={tags}
          style={styles.groupings}
        />
      </View>
      <TouchableOpacity onPress={onPressPost} delayPressIn={200}>
        {mainContent}
      </TouchableOpacity>
      {pollsContent}
      {imageContent}
      <Pressable onPress={onPressPost} style={styles.viewPostButton}>
        <Text color="primary" variant="bold">{t('View Post')}</Text>
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
    <View
      style={[styles.container, pinned && styles.pinnedBorder, style]}
      onLayout={(event: LayoutChangeEvent) => {
        const measuredHeight = event.nativeEvent.layout.height;
        if (Math.abs(measuredHeight - containerHeight) > 1) {
          setContainerHeight(measuredHeight);
        }
      }}
      {...otherProps}
    >
      {wrappedMainContent}
      {footer}
    </View>
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
  images: {
    marginVertical: spacing.m,
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
const PostItem = React.memo(BasePostItem);
export { PostItem, Props as PostItemProps };
