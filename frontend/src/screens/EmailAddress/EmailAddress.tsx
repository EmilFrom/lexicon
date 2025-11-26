import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomHeader, LoadingOrError } from '../../components';
import { FloatingButton } from '../../core-ui';
import { useStorage } from '../../helpers';
import { useProfile } from '../../hooks';
import { makeStyles } from '../../theme';
import { EmailAddress as EmailAddressType, StackNavProp } from '../../types';
import { useDevice } from '../../utils';

import EmailAddressItem from './components/EmailAddressItem';

export default function EmailAddress() {
  const styles = useStyles();
  const { isTabletLandscape } = useDevice();

  const { navigate } = useNavigation<StackNavProp<'EmailAddress'>>();

  const [loading, setLoading] = useState(false);
  const onSetLoading = React.useCallback((value: boolean) => {
    setLoading(value);
  }, []);

  const storage = useStorage();
  const username = storage.getItem('user')?.username || '';

  const ios = Platform.OS === 'ios';

  const { loading: userLoading, refetch, data: profileData } = useProfile({
    variables: { username },
    fetchPolicy: 'network-only',
  });

  // --- FIX: Derive emailAddress directly from data instead of useEffect+setState ---
  const emailAddress = useMemo(() => {
    if (profileData?.profile?.user?.__typename === 'UserDetail') {
      const result = profileData.profile;
      const { email, secondaryEmails, unconfirmedEmails } = result.user;
      const temp: Array<EmailAddressType> = [];
      temp.push({ emailAddress: email, type: 'PRIMARY' });
      secondaryEmails?.forEach((address) =>
        temp.push({ emailAddress: address, type: 'SECONDARY' }),
      );
      unconfirmedEmails?.forEach((address) =>
        temp.push({ emailAddress: address, type: 'UNCONFIRMED' }),
      );
      return temp;
    }
    return [];
  }, [profileData]);

  const onRefresh = () => {
    // setLoading(true) is optional here since userLoading handles the spinner usually, 
    // but keeping it to match original logic if needed for mutations
    refetch();
  };

  const keyExtractor = ({ emailAddress }: EmailAddressType, index: number) =>
    `${emailAddress}-${index}`;

  const renderItem = ({ item }: { item: EmailAddressType }) => (
    <EmailAddressItem
      emailAddress={item.emailAddress}
      type={item.type}
      onSetLoading={onSetLoading}
    />
  );

  if (userLoading && emailAddress.length === 0) {
    return <LoadingOrError style={styles.loadingContainer} loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {ios && (
        <CustomHeader
          title={t('Email Address')}
          rightIcon="Add"
          onPressRight={() => navigate('AddEmail')}
          disabled={loading}
          hideHeaderLeft={isTabletLandscape}
        />
      )}
      <FlatList
        data={emailAddress}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onRefresh={onRefresh}
        refreshing={userLoading || loading}
      />
      {!ios && (
        <FloatingButton
          style={styles.floatingButton}
          onPress={() => navigate('AddEmail')}
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDarker,
  },
  floatingButton: {
    flex: 1,
    position: 'absolute',
    marginRight: spacing.xxl,
    marginBottom: spacing.xxxl,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    backgroundColor: colors.background,
  },
}));