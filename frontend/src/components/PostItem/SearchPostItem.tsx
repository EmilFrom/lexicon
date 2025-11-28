import { OperationVariables, useFragment } from '@apollo/client';
import React from 'react';

import {
  SearchPostFragment,
  SearchPostFragmentDoc,
  SearchTopicFragment,
  SearchTopicFragmentDoc,
} from '../../generatedAPI/server';
import { findChannelByCategoryId, getImage, useStorage } from '../../helpers';

import { PostItem, PostItemProps } from './PostItem';

type Props = Pick<PostItemProps, 'topicId'> & {
  postId: number;
};

function BaseSearchPostItem(props: Props) {
  const storage = useStorage();

  const { topicId, postId } = props;

  const cachedSearchTopicResult = useFragment<
    SearchTopicFragment,
    OperationVariables
  >({
    fragment: SearchTopicFragmentDoc,
    fragmentName: 'SearchTopicFragment',
    from: {
      __typename: 'SearchTopic',
      id: topicId,
    },
  });
  const cacheSearchPostResult = useFragment<
    SearchPostFragment,
    OperationVariables
  >({
    fragment: SearchPostFragmentDoc,
    fragmentName: 'SearchPostFragment',
    from: {
      __typename: 'SearchPost',
      id: postId,
    },
  });
  const cachedSearchTopic = cachedSearchTopicResult.data;
  const cacheSearchPost = cacheSearchPostResult.data;

  // --- FIX START ---
  if (
    !cachedSearchTopicResult.complete ||
    !cacheSearchPostResult.complete ||
    !cachedSearchTopic ||
    !cacheSearchPost
  ) {
    return null;
  }
  // --- FIX END ---

  /* REMOVED:
  if (
    !cachedSearchTopicResult.complete ||
    !cacheSearchPostResult.complete ||
    !cachedSearchTopic ||
    !cacheSearchPost
  ) {
    throw new Error('Post not found');
  }
  */
  const channels = storage.getItem('channels');
  const channel = findChannelByCategoryId({
    categoryId: cachedSearchTopic.categoryId,
    channels,
  });

  return (
    <PostItem
      topicId={topicId}
      title={cachedSearchTopic.title ?? ''}
      content={cacheSearchPost.blurb ?? ''}
      avatar={getImage(cacheSearchPost.avatarTemplate ?? '')}
      channel={channel}
      tags={(cachedSearchTopic.tags ?? []).filter((tag): tag is string => typeof tag === 'string')}
      createdAt={cacheSearchPost.createdAt ?? ''}
      username={cacheSearchPost.username ?? ''}
      isLiked={cachedSearchTopic.liked ?? false}
      testID={`Search:SearchPostItem:${topicId}`}
    />
  );
}

const SearchPostItem = React.memo(BaseSearchPostItem);
export { SearchPostItem, Props as SearchPostItemProps };
