import { NO_EXCERPT_WORDING } from '../constants';
import { TopicsQuery } from '../generatedAPI/server';
import { Channel, PostWithoutId, User } from '../types';

import { findChannelByCategoryId } from './findChannelByCategoryId';
import { getImage } from './getUserImage';

type Topic = NonNullable<
  NonNullable<TopicsQuery['topics']['topicList']>['topics']
>[0];

type Params = Topic & { channels?: Array<Channel> };

const transformTopicToPost = ({
  posters,
  id,
  title,
  excerpt,
  firstPostContent,
  visible,
  authorUserId, // We'll keep this for a fallback
  pinned,
  liked,
  likeCount,
  postsCount,
  tags,
  bumpedAt: createdAt,
  views,
  categoryId,
  channels,
  imageUrl,
}: Params): PostWithoutId => {
  // --- THIS IS THE DEFINITIVE FIX ---
  // The primary method for finding the author should be by their description,
  // as the `authorUserId` can be null.
  let author = posters?.find((poster) =>
    poster.description.includes('Oprindelig forfatter'),
  );

  // As a fallback, if the description method fails, try the original ID-based method.
  if (!author) {
    author = posters?.find(
      (poster) => poster.userId != null && poster.userId === authorUserId,
    );
  }

  // As a final fallback, just take the first poster in the list.
  if (!author && posters && posters.length > 0) {
    author = posters[0];
  }

  const authorUser = author?.user;
  // --- END OF FIX ---

  const frequentUserArray: Array<User> = [];
  posters?.forEach((poster) => {
    if (poster.user) {
      const { user } = poster;
      // The log shows the property is named `avatar`, not `avatarTemplate`.
      frequentUserArray.push({
        id: user.id,
        username: user.username,
        avatar: getImage(user.avatar),
      });
    }
  });

  const channel = findChannelByCategoryId({
    categoryId,
    channels,
  });

  return {
    topicId: id,
    title,
    content: firstPostContent || excerpt || NO_EXCERPT_WORDING,
    hidden: !visible,
    username: authorUser?.username ?? '',
    // The log shows the property is named `avatar`.
    avatar: authorUser ? getImage(authorUser.avatar) : '',
    pinned,
    replyCount: postsCount - 1,
    likeCount,
    viewCount: views,
    isLiked: liked || false,
    channel: channel,
    tags: tags || [],
    createdAt,
    freqPosters: frequentUserArray,
    imageUrls: imageUrl
      ? [typeof imageUrl === 'string' ? imageUrl : imageUrl.url]
      : undefined,
    imageDimensions:
      imageUrl && typeof imageUrl === 'object' && imageUrl.width && imageUrl.height
        ? {
          width: imageUrl.width,
          height: imageUrl.height,
          aspectRatio: imageUrl.aspectRatio ?? imageUrl.width / imageUrl.height,
        }
        : undefined,
  };
};

export { transformTopicToPost };
