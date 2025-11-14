import React, { useEffect, useState } from 'react';
import { Platform, SafeAreaView, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';

import { Text, TextInput } from '../core-ui';
import { makeStyles } from '../theme';
import { EMOJI } from '../constants/emoji';
import { CustomHeader, HeaderItem, ModalHeader } from '../components';
import { RootStackNavProp } from '../types';
import { generateSlug } from '../helpers/generateSlug';

type EmojiRenderItem = {
  id: number;
  emoji: string;
  name: string;
};

// --- FIX 1: The Header component is now defined OUTSIDE EmojiPicker ---
// It is a standalone, static component.
const Header = ({ ios, onGoBack }: { ios: boolean; onGoBack: () => void }) => {
  // It receives the data it needs as props.
  return ios ? (
    <ModalHeader
      title={t('Emoji')}
      left={<HeaderItem label={t('Cancel')} left onPressItem={onGoBack} />}
    />
  ) : (
    <CustomHeader title={t('Emoji')} noShadow />
  );
};

export default function EmojiPicker() {
  const styles = useStyles();
  const navigation = useNavigation<RootStackNavProp<'EmojiPicker'>>();
  const { goBack } = navigation;
  const [emojis, setEmojis] = useState(EMOJI);
  const [query, setQuery] = useState('');
  const ios = Platform.OS === 'ios';

  useEffect(() => {
    // This debounce implementation is also an anti-pattern (it's recreated on every render)
    // but we can leave it for now to focus on the main lint error.
    const debounce = <T extends (args: string) => void>(
      func: T,
      delay: number,
    ) => {
      let timeoutId: NodeJS.Timeout;
      return (args: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          func(args);
        }, delay);
      };
    };

    const filterEmojis = (value: string) => {
      const filteredEmojis = EMOJI.filter(({ name }) => name.includes(value));
      setEmojis(filteredEmojis);
    };

    const debouncedFilterEmojis = debounce(filterEmojis, 800);

    debouncedFilterEmojis(query);
  }, [query]);

  // The renderItem function is okay to define inside, but it's often cleaner
  // to move it outside as well if it doesn't depend on a lot of state.
  const renderItem = ({ item }: { item: EmojiRenderItem }) => {
    const { name, emoji } = item;
    const { navigate } = navigation;

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          onPress={() => {
            navigate('EditUserStatus', { emojiCode: name, emojiText: emoji });
          }}
          key={`emoji-${name}`}
          testID={`EmojiPicker:Button:Emoji:${name}`}
        >
          <Text size="xl">{emoji}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- FIX 2: We now render the static Header and pass it props --- */}
      <Header ios={ios} onGoBack={goBack} />

      <View style={styles.bodyContainer}>
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(generateSlug(value));
          }}
          placeholder={t('Search for ...')}
          style={styles.textInput}
          testID="EmojiPicker:TextInput:Search"
        />
        <FlashList
          data={emojis}
          renderItem={renderItem}
          keyExtractor={(item: EmojiRenderItem) => `emoji-${item.name}`}
          numColumns={6}
          // Note: The 'any' cast here is still a separate issue to address
          // and so is estimatedItemSize if the prop was removed.
          // This fix focuses only on the 'static-components' error.
          estimatedItemSize={EMOJI.length}
          removeClippedSubviews={true}
          {...({} as any)}
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles(/* ... */);