import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

type Props = {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
};

export function ImageSkeleton({ width = '100%', height = 300, style }: Props) {
  const shimmerTranslate = useSharedValue(0);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false,
    );
  }, [shimmerTranslate]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerTranslate.value, [0, 1], [-300, 300]);

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E1E9EE',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
