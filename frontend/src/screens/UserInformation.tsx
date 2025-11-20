import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { View } from 'react-native';

import {
  CustomHeader,
  LoadingOrError,
  PostList,
  FullScreenImageModal,
  UserInformationPostItem,
  UserStatus,
} from '../components';
import { Avatar, Button, Text } from '../core-ui';
import { errorHandler, getImage, useStorage } from '../helpers';
import { useActivity, useProfile } from '../hooks';
import { makeStyles } from '../theme';
import { NewPostForm, StackNavProp, StackRouteProp } from '../types';
import { MarkdownRenderer } from '../components';

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  usernameText: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.s,
  },
  bioContainer: {
    paddingHorizontal: spacing.xxl,
  },
  statusContainer: {
    marginTop: spacing.m,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xl,
    marginTop: spacing.m,
  },
  activityText: {
    paddingLeft: spacing.xl,
    paddingVertical: spacing.xl,
  },
  fill: {
    width: '100%',
    flexGrow: 1,
  },
  noActivity: {
    width: '100%',
  },
  noActivityText: {
    alignSelf: 'center',
  },
}));

type UserInformationStyles = ReturnType<typeof useStyles>;

type UserInformationHeaderProps = {
  styles: UserInformationStyles;
  username: string;
  userImage: string;
  bioPreview: string;
  statusUser?: {
    emoji?: string | null;
    description?: string | null;
  } | null;
  currentUser?: string;
  onPressAvatar: () => void;
  onPressNewMessage: () => void;
};

function UserInformationHeader({
  styles,
  username,
  userImage,
  bioPreview,
  statusUser,
  currentUser,
  onPressAvatar,
  onPressNewMessage,
}: UserInformationHeaderProps) {
  return (
    <>
      <View style={styles.headerContainer}>
        <CustomHeader title="" noShadow />
        <Avatar
          src={userImage}
          size="l"
          label={username[0]}
          onPress={onPressAvatar}
        />
        <View style={styles.usernameText}>
          <Text variant="semiBold" size="l">
            {username}
          </Text>
        </View>
        <MarkdownRenderer content={bioPreview} style={styles.bioContainer} />
        {statusUser && (statusUser.emoji || statusUser.description) && (
          <UserStatus
            emojiCode={statusUser.emoji ?? ''}
            status={statusUser.description ?? ''}
            styleContainer={styles.statusContainer}
          />
        )}
        <View style={styles.buttonContainer}>
          {currentUser !== username && (
            <Button content={t('Message')} onPress={onPressNewMessage} />
          )}
        </View>
      </View>
      <Text variant={'semiBold'} style={styles.activityText}>
        {t('Activity')}
      </Text>
    </>
  );
}

export default function UserInformation() {
  const styles = useStyles();

  const { navigate } = useNavigation<StackNavProp<'UserInformation'>>();

  const {
    params: { username },
  } = useRoute<StackRouteProp<'UserInformation'>>();
  const { reset: resetForm } = useFormContext<NewPostForm>();

  const storage = useStorage();
  const currentUser = storage.getItem('user')?.username;

  const [show, setShow] = useState<boolean>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
  } = useProfile(
    {
      variables: { username },
    },
    'HIDE_ALERT',
  );

  const { data, loading, error, networkStatus, refetch, fetchMore } =
    useActivity({ variables: { username: username, offset: 0 } }, 'HIDE_ALERT');

  console.log('User Activity Data:', data);

  const activities = data?.activity ?? [];

  const onEndReached = (distanceFromEnd: number) => {
    if (distanceFromEnd === 0) {
      return;
    }
    fetchMore({ variables: { offset: activities.length } });
  };

  const onRefresh = () => {
    setRefreshing(true);
    refetch();
    setRefreshing(false);
  };

  const onPressCancel = () => {
    setShow(false);
  };

  const onPressNewMessage = async () => {
    resetForm({
      messageTargetSelectedUsers: [username],
      messageUsersList: [{ name, username, avatar: userImage }],
      draftKey: '',
    });
    navigate('NewMessage');
  };

  if (error || profileError) {
    const errorMessage = error
      ? errorHandler(error, true)
      : profileError
      ? errorHandler(profileError, true)
      : undefined;
    return <LoadingOrError message={errorMessage} />;
  }

  if (
    (loading || profileLoading || (data && data.activity?.length > 0)) &&
    activities.length < 1
  ) {
    return <LoadingOrError loading />;
  }

  const name = profileData?.profile.user.name || '';
  const userImage = getImage(profileData?.profile.user.avatar || '', 'xl');
  const bio = profileData?.profile.user.bioRaw;
  const splittedBio = bio ? bio.split(/\r\n|\r|\n/) : [''];
  const statusUser = profileData && profileData.profile?.user.status;

  const bioPreview = splittedBio
    ? splittedBio.length > 3
      ? `${splittedBio.slice(0, 3).join('\n')}...`
      : bio
      ? bio
      : ''
    : '';

  const headerNode = (
    <UserInformationHeader
      styles={styles}
      username={username}
      userImage={userImage}
      bioPreview={bioPreview}
      statusUser={statusUser}
      currentUser={currentUser}
      onPressAvatar={() => setShow(true)}
      onPressNewMessage={onPressNewMessage}
    />
  );

  let content;
  if (activities.length !== 0) {
    content = (
      <PostList
        ListHeaderComponent={headerNode}
        data={activities}
        onRefresh={onRefresh}
        refreshing={networkStatus === 4 || refreshing}
        scrollEventThrottle={16}
        alwaysBounceVertical={true}
        style={styles.fill}
        onEndReachedThreshold={0.1}
        onEndReached={({ distanceFromEnd }) => onEndReached(distanceFromEnd)}
        renderItem={({ item }) => {
          return (
            <UserInformationPostItem
              topicId={item.topicId}
              postId={item.postId}
              actionType={item.actionType}
              currentUser={username}
            />
          );
        }}
        testID="UserInformation:PostList"
      />
    );
  } else {
    content = (
      <View style={styles.noActivity}>
        {headerNode}
        <Text style={styles.noActivityText}>
          {t("This user doesn't have any activity")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {content}
       <FullScreenImageModal
        visible={show || false}
        imageUri={userImage}
        onClose={onPressCancel}
      />
    </View>
  );
}
