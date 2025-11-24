import { OperationVariables, useFragment } from '@apollo/client';
import React from 'react';

import {
  UserActionFragment,
  UserActionFragmentDoc,
} from '../../generatedAPI/server';
import { findChannelByCategoryId, getImage, useStorage } from '../../helpers';

import { PostItem, PostItemProps } from './PostItem';

type Props = Pick<PostItemProps, 'currentUser' | 'topicId' | 'style'> & {
  postId?: number | null;
  actionType: number;
};
const LIKED_ACTION_TYPE = 1;

function BaseUserInformationPostItem(props: Props) {
  const storage = useStorage();

  const { topicId, postId, actionType, currentUser, style } = props;

  const cacheUserActionResult = useFragment<
    UserActionFragment,
    OperationVariables
  >({
    fragment: UserActionFragmentDoc,
    fragmentName: 'UserActionFragment',
    from: {
      __typename: 'UserActions',
      postId: postId,
      topicId: topicId,
      actionType,
    },
  });
  const cacheUserAction = cacheUserActionResult.data;

  // --- FIX START ---
  if (!cacheUserActionResult.complete || !cacheUserAction) {
    return null;
  }
  // --- FIX END ---

  /* REMOVED:
  if (!cacheUserActionResult.complete || !cacheUserAction) {
    throw new Error('Post not found');
  }
  */

  const {
    title,
    excerpt,
    avatarTemplate,
    categoryId,
    hidden,
    createdAt,
    username,
    markdownContent: content,
  } = cacheUserAction;
  const channels = storage.getItem('channels');

  const channel = findChannelByCategoryId({
    categoryId: categoryId,
    channels,
  });

  const avatar = getImage(avatarTemplate);
  const isLiked = actionType === LIKED_ACTION_TYPE;

  return (
    <PostItem
      topicId={topicId}
      title={title}
      currentUser={currentUser}
      content={content || excerpt}
      avatar={avatar}
      channel={channel}
      hidden={!!hidden}
      createdAt={createdAt}
      username={username}
      isLiked={isLiked}
      showLabel
      showImageRow
      style={style}
    />
  );
}

const UserInformationPostItem = React.memo(BaseUserInformationPostItem);
export { UserInformationPostItem, Props as UserInformationPostItemProps };
