import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, ViewProps } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';

import { FIRST_POST_NUMBER } from '../../constants';
import { ActivityIndicator, Divider } from '../../core-ui';
import { getUpdatedLikeCount } from '../../helpers';
import { useLikeTopicOrPost } from '../../hooks';
import { makeStyles, useTheme } from '../../theme';
import { useOngoingLikedTopic } from '../../utils';

import { MetricItem } from './MetricItem';

type Props = {
  postNumber?: number;
  likePerformedFrom?: 'home-scene' | 'topic-detail';
} & MetricViewProps;

export { Props as MetricsProp };

const DEBOUNCE_WAIT_TIME = 1000;

export function Metrics(props: Props) {
  const { likedTopics } = useOngoingLikedTopic();

  const {
    postId,
    topicId,
    viewCount,
    replyCount,
    likeCount: likeCountProps = 0,
    postNumber,
    isLiked,
    isCreator,
    likePerformedFrom = 'topic-detail',
    onPressReply,
    onPressView,
    ...otherProps
  } = props;

  const [optimisticLike, setOptimisticLike] = useState<{
    liked: boolean;
    likeCount: number;
  } | null>(null);
  const isFromHomeScene = likePerformedFrom === 'home-scene';

  const [like] = useLikeTopicOrPost();

  const performDebouncedLike = useDebouncedCallback(
    (liked: boolean, previousLikeCount: number) => {
      if (liked === isLiked) {
        return;
      }
      like({
        variables: {
          unlike: isLiked,
          ...(isFromHomeScene ? { topicId } : { postId }),
          likeCount: previousLikeCount,
        },
      });
    },
    DEBOUNCE_WAIT_TIME,
  );

  const baseLikeData = useMemo(() => {
    const isFirstPost = postNumber === FIRST_POST_NUMBER;

    if (!isFromHomeScene && !isFirstPost) {
      return { liked: isLiked, likeCount: likeCountProps };
    }

    const { liked: likedTopic, likeCount: topicLikeCount } =
      likedTopics[topicId] ?? {};
    const liked = likedTopic ?? isLiked;

    if (!isFirstPost) {
      return { liked, likeCount: topicLikeCount ?? likeCountProps };
    }

    const likeCount =
      liked === isLiked
        ? likeCountProps
        : getUpdatedLikeCount({ liked, previousCount: likeCountProps });

    return { liked, likeCount };
  }, [
    isFromHomeScene,
    isLiked,
    likeCountProps,
    likedTopics,
    postNumber,
    topicId,
  ]);

  const effectiveOptimistic = useMemo(() => {
    if (!optimisticLike) {
      return null;
    }
    const matchesBase =
      optimisticLike.liked === baseLikeData.liked &&
      optimisticLike.likeCount === baseLikeData.likeCount;
    return matchesBase ? null : optimisticLike;
  }, [baseLikeData, optimisticLike]);

  // Ensuring debounced callback is called if it hasn't fired when component unmount
  useEffect(() => {
    return () => {
      performDebouncedLike.flush();
    };
  }, [performDebouncedLike]);

  // TODO: Add navigation #800
  const displayLikeData = effectiveOptimistic ?? baseLikeData;

  const onPressLike = useCallback(() => {
    setOptimisticLike((prev) => {
      const base = prev ?? displayLikeData;
      const nextLiked = !base.liked;
      const likeCount = getUpdatedLikeCount({
        liked: nextLiked,
        previousCount: base.likeCount,
      });
      performDebouncedLike(nextLiked, base.likeCount);
      return { liked: nextLiked, likeCount };
    });
  }, [displayLikeData, performDebouncedLike]);

  return (
    <MetricsView
      topicId={topicId}
      postId={postId}
      isLiked={displayLikeData.liked}
      likeCount={displayLikeData.likeCount}
      replyCount={replyCount}
      viewCount={viewCount}
      isCreator={isCreator}
      onPressLike={onPressLike}
      onPressReply={onPressReply}
      onPressView={onPressView}
      {...otherProps}
    />
  );
}

type MetricViewProps = ViewProps & {
  topicId: number;
  postList?: boolean;
  replyCount: number;
  likeCount: number;
  isLiked: boolean;
  postId?: number;
  viewCount?: number;
  isCreator?: boolean;
  onPressLike?: () => void;
  onPressReply?: (params: { postId?: number; topicId: number }) => void;
  onPressView?: () => void;
};

function BaseMetricsView(props: MetricViewProps) {
  const {
    topicId,
    postList = false,
    replyCount,
    likeCount,
    isLiked,
    postId,
    viewCount,
    isCreator,
    onPressReply,
    onPressLike,
    onPressView,
    style,
    ...otherProps
  } = props;

  const styles = useStyles();
  const { colors } = useTheme();
  const isLoading = !postId && !postList;

  return (
    <View
      style={[styles.container, style, isLoading && styles.metricLoading]}
      {...otherProps}
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <>
          {viewCount != null && (
            <>
              <MetricItem
                type="Views"
                count={viewCount}
                onPress={onPressView}
              />
              <Divider vertical horizontalSpacing="xl" />
            </>
          )}
          <MetricItem
            type="Likes"
            count={likeCount}
            onPress={onPressLike}
            disabled={isCreator}
            color={isLiked ? colors.liked : colors.textLighter}
            style={styles.likes}
          />
          <MetricItem
            type="Replies"
            count={replyCount}
            onPress={() => onPressReply?.({ postId, topicId })}
            testID="Metrics:Replies"
          />
        </>
      )}
    </View>
  );
}

const MetricsView = memo(BaseMetricsView);

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    flexGrow: 1,
    flexDirection: 'row',
  },
  metricLoading: {
    justifyContent: 'center',
  },
  likes: {
    paddingRight: spacing.xl,
  },
}));
