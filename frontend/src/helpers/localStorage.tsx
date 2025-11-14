import {
  Boolean,
  Literal,
  Number,
  Record,
  String,
  Undefined,
  Union,
  Array,
} from 'runtypes';

import { ChannelList } from '../types';

import { createCachedStorage } from './createCachedStorage';

const ColorScheme = Literal('light')
  .Or(Literal('dark'))
  .Or(Literal('no-preference'));

const Aesthetic = Literal('ios').Or(Literal('android'));

export const User = Record({
  id: Number,
  name: String,
  username: String,
  avatar: String,
  trustLevel: Union(Number, Undefined),
  groups: Array(String),
});

export const UserStatus = Record({
  emojiSet: String,
  externalEmojiUrl: String,
  discourseBaseUrl: String,
});

export const PollSetting = Record({
  allowPoll: Boolean,
  pollCreateMinimumTrustLevel: Number,
});

export const PushNotificationsPreferences = Record({
  shouldShowAlert: Boolean,
  shouldPlaySound: Boolean,
  shouldSetBadge: Boolean,
});

export const SelectedHomeChannelId = Number;

const [StorageProvider, useStorage] = createCachedStorage(
  {
    colorScheme: (value) => ColorScheme.check(value),
    aesthetic: (value) => Aesthetic.check(value),
    user: (value) => User.check(value),
    expoPushToken: (value) => String.check(value),
    channels: (value) => ChannelList.check(value),
    pushNotifications: (value) => PushNotificationsPreferences.check(value),
    userStatus: (value) => UserStatus.check(value),
    poll: (value) => PollSetting.check(value),
    homeChannelId: (value) => SelectedHomeChannelId.check(value),
  },
  '@Cached/',
);

export { StorageProvider, useStorage };
