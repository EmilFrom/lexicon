import React, { Fragment, useState, useMemo } from 'react'; // Added useMemo
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
import { discourseHost } from '../../../constants'; // Import discourseHost

type Props = {
  // ... existing props
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
  // ... destructure props
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

  // 1. Get images from Markdown (if any)
  const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');
  
  // 2. COMBINE IMAGES (Markdown + Uploads Array)
  const images = useMemo(() => {
    // A. From Markdown text
    const markdownImages = getCompleteImageVideoUrls(filteredMarkdown)?.filter(Boolean) as string[] || [];

    // B. From Uploads metadata (common in Chat)
    const uploads = 'uploads' in content ? content.uploads : [];
    
    const uploadImages = uploads.filter(u => {
        // Check extension
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
        if (u.extension && allowedExtensions.includes(u.extension.toLowerCase())) return true;
        // Check URL pattern if extension missing
        if (u.url && u.url.match(/\.(jpeg|jpg|gif|png|webp|heic|heif)($|\?)/i)) return true;
        return false;
    }).map(u => {
        // Normalize to Absolute URL
        if (u.url.startsWith('http')) return u.url;
        if (u.url.startsWith('//')) return `https:${u.url}`;
        return `${discourseHost}${u.url}`;
    });

    // Combine and Deduplicate
    return Array.from(new Set([...markdownImages, ...uploadImages]));
  }, [filteredMarkdown, content]);

  // 3. Fetch Dimensions
  const { dimensions } = useImageDimensions(images);

  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = filteredMarkdown.replace(imageTagRegex, '');
  const markdownContentScene = handleUnsupportedMarkdown(contentWithoutImages);

  // 4. Unsupported Logic (Check if there are NON-image uploads)
  const unsupported = 'uploads' in content
    ? content.uploads.some(u => {
        // If this upload's URL is NOT in our approved image list, it's an unsupported file (pdf, zip, etc)
        // We construct the full URL to match against our 'images' array
        let fullUrl = u.url;
        if (fullUrl.startsWith('//')) fullUrl = `https:${fullUrl}`;
        else if (!fullUrl.startsWith('http')) fullUrl = `${discourseHost}${fullUrl}`;

        return !images.includes(fullUrl);
      })
    : false;

  const renderUnsupported = () => {
    return (
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
  };

  const renderMessageContent = () => (
    <>
      <MarkdownRenderer
        fontColor={automaticFontColor(colors.backgroundDarker)}
        content={markdownContentScene}
      />
      {/* 
         This will now render because 'images' includes the uploads 
         even if they weren't in the markdown text 
      */}
      {images.length > 0 && (
        <ImageCarousel
          images={images}
          onImagePress={(uri) => setFullScreenImage(uri)}
          imageDimensionsMap={dimensions}
          maxHeight={250} // <--- Specific size limit for Chat
        />
      )}
      {unsupported && renderUnsupported()}
    </>
  );


  const renderFirstChatBubble = () => {
    return (
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
  };

  const renderChatBubble = () => {
    if (!markdownContentScene && images.length === 0) {
      return null;
    }
    return (
      <View style={styles.nextItem}>
        {renderMessageContent()}
      </View>
    );
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

const useStyles = makeStyles(({ spacing, colors }) => {
  return {
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
  };
});
