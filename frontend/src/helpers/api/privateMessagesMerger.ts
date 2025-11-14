import {
  PrivateMessageList,
  PrivateMessageTopic,
  UserIcon,
} from '../../types/api';

export function privateMessagesMerger(
  pmInbox?: PrivateMessageList,
  pmSent?: PrivateMessageList,
) {
  const inboxTopic = pmInbox?.topicList.topics || [];
  const sentTopic = pmSent?.topicList.topics || [];
  const allTopics = inboxTopic
    .concat(sentTopic)
    .reduce<Array<PrivateMessageTopic>>((prev, curr) => {
      if (prev.find(({ id }) => id === curr.id)) {
        return prev;
      } else {
        return [...prev, curr];
      }
    }, []);
  const inboxUser = pmInbox?.users || [];
  const sentUser = pmSent?.users || [];
  const allUser = inboxUser
    .concat(sentUser)
    .reduce<Array<UserIcon>>((prev, curr) => {
      if (prev.find(({ id }) => id === curr.id)) {
        return prev;
      } else {
        return [...prev, curr];
      }
    }, []);

  const inboxGroups = pmInbox?.primaryGroups ?? [];
  const outboxGroups = pmSent?.primaryGroups ?? [];
  const primaryGroups = [...new Set([...inboxGroups, ...outboxGroups])];

  const completePM = {
    primaryGroups,
    topicList: {
      ...pmInbox?.topicList,
      topics: allTopics.sort((a, b) =>
        a.lastPostedAt > b.lastPostedAt
          ? -1
          : a.lastPostedAt < b.lastPostedAt
          ? 1
          : 0,
      ),
    },
    users: allUser,
  };

  return completePM;
}
