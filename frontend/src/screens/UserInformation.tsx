import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { View } from 'react-native';

import {
  CustomHeader,
  LoadingOrError,
  Markdown,
  PostList,
  ShowImageModal,
  UserInformationPostItem,
  UserStatus,
} from '../components';
import { Avatar, Button, Text } from '../core-ui';
import { errorHandler, getImage, useStorage } from '../helpers';
import { useActivity, useProfile } from '../hooks';
import { makeStyles } from '../theme';
import { NewPostForm, StackNavProp, StackRouteProp } from '../types';

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
  // ... (This component remains the same)
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

  // --- START OF DIAGNOSTIC LOGS ---
  console.log(`--- UserInformation Render for username: ${username} ---`);

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

  const activities = data?.activity ?? [];

  console.log('Profile Loading:', profileLoading);
  console.log('Profile Error:', JSON.stringify(profileError, null, 2));
  console.log('Profile Data:', JSON.stringify(profileData, null, 2));

  console.log('Activity Loading:', loading);
  console.log('Activity Error:', JSON.stringify(error, null, 2));
  console.log('Activity Data:', JSON.stringify(data, null, 2));
  // --- END OF DIAGNOSTIC LOGS ---

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
    console.log('--- Rendering Error State ---');
    const errorMessage = error
      ? errorHandler(error, true)
      : profileError
      ? errorHandler(profileError, true)
      : undefined;
    return <LoadingOrError message={errorMessage} />;
  }

  if (
    (loading || profileLoading || (data && data.activity?.length !== 0)) &&
    activities.length < 1
  ) {
    console.log('--- Rendering Loading State ---');
    return <LoadingOrError loading />;
  }
  
  // --- Log before final render ---
  console.log('--- Data is loaded, attempting to render content ---');

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
      <ShowImageModal
        show={show || false}
        userImage={{ uri: userImage }}
        onPressCancel={onPressCancel}
      />
    </View>
  );
}