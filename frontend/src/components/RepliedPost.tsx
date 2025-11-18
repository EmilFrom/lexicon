import React from 'react';
import { View } from 'react-native';

import { client } from '../api/client';
import { Divider } from '../core-ui';
import {
  PostFragment,
  PostFragmentDoc,
  useRepliedPostQuery,
} from '../generatedAPI/server';
import {
  getImage,
  handleUnsupportedMarkdown,
  RepliedPostLoadFail,
} from '../helpers';
import { makeStyles } from '../theme';

import { Author } from './Author';
import { LoadingOrError } from './LoadingOrError';
import { MarkdownRenderer } from './MarkdownRenderer';

type GeneralRepliedPostProps = {
  hideAuthor?: boolean;
};

type BaseRepliedPostProps = GeneralRepliedPostProps &
  Pick<PostFragment, 'avatar' | 'username' | 'markdownContent' | 'mentions'>;

function BaseRepliedPost(props: BaseRepliedPostProps) {
  const styles = useStyles();
  
  const { avatar, username, markdownContent, mentions, hideAuthor } = props;
  const imageTagRegex = /<img[^>]*>/g;
  const contentWithoutImages = markdownContent ? markdownContent.replace(imageTagRegex, '') : '';


  return (
    <View style={styles.nestedRowContainer}>
      <Divider vertical />
      <View style={styles.nestedCommentContainer}>
        {!hideAuthor && <Author image={getImage(avatar)} title={username} />}
        <MarkdownRenderer
          style={styles.nestedContent}
          content={handleUnsupportedMarkdown(contentWithoutImages ?? '')}
        />
      </View>
    </View>
  );
}

type RepliedPostLoadingOrErrorProps = {
  loading?: boolean;
  error?: boolean;
};

function RepliedPostLoadingOrError({
  loading,
  error,
}: RepliedPostLoadingOrErrorProps) {
  const styles = useStyles();

  return (
    <View style={styles.nestedRowContainer}>
      <Divider vertical />
      <View style={styles.nestedCommentContainer}>
        <LoadingOrError
          message={error ? RepliedPostLoadFail : undefined}
          loading={loading}
        />
      </View>
    </View>
  );
}

type RepliedPostProps = {
  postId: number;
  replyToPostId?: number;
} & GeneralRepliedPostProps;

export function RepliedPost(props: RepliedPostProps) {
  const { hideAuthor = false, postId, replyToPostId } = props;
  const { data, loading, error } = useRepliedPostQuery({
    variables: {
      postId, //used to look for replies of current post
      replyToPostId, //used to look post at cache
    },
  });
  if (!data || loading) {
    return <RepliedPostLoadingOrError loading={loading} error={!!error} />;
  }

  const { replyingTo } = data;

  // If there's no replyingTo data, it means this post isn't a reply to anything
  // Just return null instead of showing an error
  if (!replyingTo || !replyingTo.post) {
    return null;
  }

  const { post } = replyingTo;

  return <BaseRepliedPost {...post} hideAuthor={hideAuthor} />;
}

type LocalRepliedPostProps = {
  replyToPostId: number;
} & GeneralRepliedPostProps;

export function LocalRepliedPost(props: LocalRepliedPostProps) {
  const replyingTo = client.readFragment<PostFragment>({
    fragment: PostFragmentDoc,
    fragmentName: 'PostFragment',
    id: `Post:${String(props.replyToPostId)}`,
  });

  // If there's no cached data for the replied-to post, just don't render anything
  if (!replyingTo) {
    return null;
  }

  return <BaseRepliedPost {...replyingTo} hideAuthor={props.hideAuthor} />;
}

const useStyles = makeStyles(({ spacing }) => ({
  nestedRowContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  nestedCommentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  nestedContent: {
    marginTop: spacing.xl,
  },
}));

export { LocalRepliedPostProps, RepliedPostProps };
