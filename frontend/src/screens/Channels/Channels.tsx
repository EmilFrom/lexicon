import React, { useState, useEffect } from 'react';
import { Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useFormContext } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomHeader, HeaderItem, ModalHeader } from '../../components';
import {
  isNoChannelFilter,
  NO_CHANNEL_FILTER,
  NO_CHANNEL_FILTER_ID,
} from '../../constants';
import { useStorage } from '../../helpers';
import { useChannels } from '../../hooks';
import { makeStyles } from '../../theme';
import { RootStackNavProp, RootStackRouteProp } from '../../types';

import ChannelItem from './Components/ChannelItem';
import { NewProjectModal } from './Components/NewProjectModal';

export default function Channels() {
  const styles = useStyles();

  const { navigate, goBack } = useNavigation<RootStackNavProp<'Channels'>>();

  const {
    params: { prevScreen },
  } = useRoute<RootStackRouteProp<'Channels'>>();

  const storage = useStorage();
  const channels = storage.getItem('channels');
  const { setValue, getValues } = useFormContext();
  const { channelId: selectedChannelId } = getValues();
  const homeSelectedChannelId = storage.getItem('homeChannelId');

  const selectedChannel =
    prevScreen === 'Home' ? homeSelectedChannelId : selectedChannelId;

  const ios = Platform.OS === 'ios';

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { refetch: refetchChannels, data: channelsData } = useChannels(
    {},
    'HIDE_ALERT',
  );

  // Update storage when channels data changes
  useEffect(() => {
    if (channelsData?.category?.categories) {
      const updatedChannels = channelsData.category.categories.map((channel) => {
        const { id, color, name, descriptionText } = channel;
        return { id, color, name, description: descriptionText ?? null };
      });
      storage.setItem('channels', updatedChannels);
    }
  }, [channelsData, storage]);

  const handleNewProjectSuccess = async (categoryId: number) => {
    // Close the modal first
    setShowNewProjectModal(false);
    
    // Refetch channels to get the newly created project
    await refetchChannels();
    
    // Select the newly created project and navigate to Home
    if (prevScreen === 'Home') {
      storage.setItem('homeChannelId', categoryId);
      navigate('TabNav', { screen: 'Home' });
    } else {
      setValue('channelId', categoryId, { shouldDirty: true });
      navigate(prevScreen);
    }
  };

  const onPress = (id: number) => {
    if (prevScreen === 'Home') {
      storage.setItem('homeChannelId', id);
      navigate('TabNav', { screen: 'Home' });
    } else {
      setValue('channelId', id, { shouldDirty: true });
      navigate(prevScreen);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {ios ? (
        <ModalHeader
          title={t('Channels')}
          left={<HeaderItem label={t('Cancel')} onPressItem={goBack} left />}
          right={
            <HeaderItem
              icon="Add"
              onPressItem={() => setShowNewProjectModal(true)}
            />
          }
        />
      ) : (
        <CustomHeader
          title={t('Channels')}
          noShadow
          rightIcon="Add"
          onPressRight={() => setShowNewProjectModal(true)}
        />
      )}

      <ScrollView>
        {prevScreen === 'Home' && (
          <ChannelItem
            isSelected={isNoChannelFilter(
              homeSelectedChannelId || NO_CHANNEL_FILTER_ID,
            )}
            channel={NO_CHANNEL_FILTER}
            onPress={() => onPress(NO_CHANNEL_FILTER.id)}
          />
        )}
        {channels?.map((channel) => {
          const { id } = channel;
          return (
            <ChannelItem
              key={id}
              isSelected={id === selectedChannel}
              channel={channel}
              onPress={() => onPress(id)}
            />
          );
        })}
      </ScrollView>

      <NewProjectModal
        visible={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onSuccess={handleNewProjectSuccess}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
