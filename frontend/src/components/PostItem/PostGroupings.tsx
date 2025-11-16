import React from 'react';
import { ScrollViewProps, View } from 'react-native';

import { Chip, ChipRow } from '../../core-ui';
import { useSiteSettings } from '../../hooks';
import { Channel } from '../../types';

type Props = ScrollViewProps & {
  channel: Channel;
  tags?: Array<string>;
};

export function PostGroupings(props: Props) {
  const { taggingEnabled } = useSiteSettings();

  const { channel, tags = [], ...scrollViewProps } = props;

  const channelChip = {
    content: channel.name,
    decorationColor: `#${channel.color}`,
  };

  if (!taggingEnabled || tags.length === 0) {
    return (
      <View {...scrollViewProps}>
        <Chip {...channelChip} />
      </View>
    );
  }

  const items = [channelChip, ...tags.map((content) => ({ content }))];

  return <ChipRow items={items} {...scrollViewProps} />;
}
