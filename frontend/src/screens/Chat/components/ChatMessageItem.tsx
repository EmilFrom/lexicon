import React, { Fragment, useState, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { MarkdownRenderer } from '../../../components/MarkdownRenderer';
import { ImageCarousel } from '../../../components/ImageCarousel';
import { FullScreenImageModal } from '../../../components/FullScreenImageModal';
import { MetricItem } from '../../../components/Metrics/MetricItem';
import { Avatar, Icon, Text } from '../../../core-ui';
import {
  automaticFontColor,
  filterMarkdownContentPoll,
  formatDateTime,
  formatTime,
  getImage,
  handleUnsupportedMarkdown,
} from '../../../helpers';
import { getCompleteImageVideoUrls } from '../../../helpers/api/processRawContent';
import { makeStyles, useTheme } from '../../../theme';
import {
  ChatMessageContent,
  ThreadDetailFirstContent,
  User,
} from '../../../types';
import { useImageDimensions } from '../../../hooks/useImageDimensions';
import { discourseHost } from '../../../constants';
import { markdownToHtml } from '../../../helpers/markdownToHtml'; // <--- ADD IMPORT

type Props = {
  content: ChatMessageContent | ThreadDetailFirstContent;
  sender: User;
  newTimestamp: boolean;
  onPressAvatar?: () => void;
  unread?: boolean;
  settings: boolean;
  firstChatBubbleStyle?: StyleProp<ViewStyle>;
  onPressReplies?: () => void;
  hideReplies?: boolean;
  testID?: string;
  isLoading?: boolean;
};

export function ChatMessageItem(props: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    content,
    sender,
    newTimestamp,
    onPressAvatar,
    unread,
    settings,
    firstChatBubbleStyle,
    onPressReplies,
    hideReplies,
    testID,
    isLoading,
  } = props;

  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const { id, time, markdownContent } = content;

  // 1. Extract Polls from Markdown
  const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');

  // 2. Convert Markdown to HTML (Fixes raw text issue)
  const htmlContent = useMemo(
    () => markdownToHtml(filteredMarkdown),
    [filteredMarkdown],
  );

  // 3. COMBINE IMAGES (HTML + Uploads Array)
  const images = useMemo(() => {
    // A. From Converted HTML
    const markdownImages =
      (getCompleteImageVideoUrls(htmlContent)?.filter(Boolean) as string[]) ||
      [];

    // B. From Uploads metadata
    const uploads = 'uploads' in content ? content.uploads : [];

    const uploadImages = uploads
      .filter((u) => {
        const allowedExtensions = [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'heic',
          'heif',
        ];
        if (
          u.extension &&
          allowedExtensions.includes(u.extension.toLowerCase())
        )
          return true;
        if (u.url && u.url.match(/\.(jpeg|jpg|gif|png|webp|heic|heif)($|\?)/i))
          return true;
        return false;
      })
      .map((u) => {
        if (u.url.startsWith('http')) return u.url;
        if (u.url.startsWith('//')) return `https:${u.url}`;
        return `${discourseHost}${u.url}`;
      });

    // Combine and Deduplicate
    return Array.from(new Set([...markdownImages, ...uploadImages]));
  }, [htmlContent, content]);

  // 4. Fetch Dimensions
  const { dimensions } = useImageDimensions(images);

  // 5. Prepare Text Content (Strip images from HTML)
  const imageTagRegex = /<img[^>]*>/g;
  // Use htmlContent here instead of filteredMarkdown
  const contentWithoutImages = htmlContent.replace(imageTagRegex, '');
  const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

  // 6. Unsupported Logic
  const unsupported =
    'uploads' in content
      ? content.uploads.some((u) => {
          let fullUrl = u.url;
          if (fullUrl.startsWith('//')) fullUrl = `https:${fullUrl}`;
          else if (!fullUrl.startsWith('http'))
            fullUrl = `${discourseHost}${fullUrl}`;

          return !images.includes(fullUrl);
        })
      : false;

  const renderUnsupported = () => (
    <View style={styles.unsupported}>
      <Icon
        name="Information"
        size="xl"
        color={colors.textLighter}
        style={styles.unsupportedIcon}
      />
      <Text size="xs" color="textLight" style={styles.unsupportedText}>
        {t('Unsupported file type.')}
      </Text>
      <Text size="xs" color="textLight" style={styles.unsupportedText}>
        {t('To open, please visit Discourse web.')}
      </Text>
    </View>
  );

  const renderMessageContent = () => (
    <>
      <MarkdownRenderer
        fontColor={automaticFontColor(colors.backgroundDarker)}
        content={markdownContentScene}
      />
      {images.length > 0 && (
        <ImageCarousel
          images={images}
          onImagePress={(uri) => setFullScreenImage(uri)}
          imageDimensionsMap={dimensions}
          maxHeight={250} // Restrict height for chat interface
        />
      )}
      {unsupported && renderUnsupported()}
    </>
  );

  const renderFirstChatBubble = () => (
    <View style={[styles.firstItem, firstChatBubbleStyle]}>
      <Avatar
        src={getImage(sender.avatar)}
        style={styles.avatar}
        onPress={onPressAvatar}
        size="xs"
      />
      <View style={styles.flex}>
        <Text color="textLight" size="xs" style={styles.name}>
          {t('{sender} • {time}', {
            sender: sender?.username,
            time: formatTime({ dateString: time, hour12: true }),
          })}
        </Text>
        {renderMessageContent()}
      </View>
    </View>
  );

  const renderChatBubble = () => {
    if (!markdownContentScene && images.length === 0 && !unsupported) {
      return null;
    }
    return <View style={styles.nextItem}>{renderMessageContent()}</View>;
  };

  return (
    <View style={styles.flex} testID={testID}>
      <Fragment key={id}>
        {newTimestamp && (
          <Text
            color="textLight"
            size="xs"
            style={[styles.timestamp, styles.time]}
          >
            {formatDateTime(time, 'medium')}
          </Text>
        )}

        <View style={styles.messageItem}>
          {settings ? renderFirstChatBubble() : renderChatBubble()}
          {!hideReplies &&
          'replyCount' in content &&
          content.replyCount != null &&
          content.replyCount !== undefined ? (
            <View style={[styles.nextItem, styles.threadButton]}>
              <MetricItem
                type="Thread"
                count={content.replyCount}
                fontStyle={styles.metric}
                onPress={onPressReplies}
                testID={`Chat:ChatItem:MetricItem:IconWithLabel:${id}`}
                isLoading={isLoading}
                disabled={isLoading}
              />
            </View>
          ) : null}
        </View>

        {unread && (
          <View style={styles.unread}>
            <Text color="textLight" size="xs" style={styles.time}>
              {t('Unread Messages')}
            </Text>
          </View>
        )}
      </Fragment>

      <FullScreenImageModal
        visible={!!fullScreenImage}
        imageUri={fullScreenImage || ''}
        onClose={() => setFullScreenImage(null)}
      />
    </View>
  );
}

const useStyles = makeStyles(({ spacing, colors }) => ({
  flex: { flex: 1 },
  time: { alignSelf: 'center' },
  name: { paddingBottom: spacing.s },
  messageItem: { paddingHorizontal: spacing.xl },
  firstItem: {
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  nextItem: { marginLeft: spacing.xxxxl },
  avatar: { marginRight: spacing.l },
  timestamp: { marginBottom: spacing.m },
  unread: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.m,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDarker,
    marginBottom: spacing.m,
  },
  unsupported: {
    borderWidth: 1,
    borderColor: colors.border,
    height: 100,
    borderRadius: 4,
    backgroundColor: colors.backgroundDarker,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  unsupportedIcon: { marginBottom: spacing.s },
  unsupportedText: { textAlign: 'center' },
  threadButton: {
    borderWidth: 1,
    borderColor: colors.border,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingHorizontal: spacing.m,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginBottom: spacing.m,
  },
  metric: { flexGrow: 0 },
}));
