import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalProps,
  Platform,
  StyleProp,
  TouchableWithoutFeedback,
  ViewStyle,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ANIMATION_DURATION } from '../../constants/theme/animations';
import { makeStyles } from '../../theme';

import { ActionSheetItem, ActionSheetItemProps } from './ActionSheetItem';

type Props = ModalProps & {
  options: Array<Pick<ActionSheetItemProps, 'label' | 'disabled'>>;
  cancelButtonIndex?: number;
  actionItemOnPress: (index: number) => void;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
};

export { Props as ActionSheetProps };

const ios = Platform.OS === 'ios';

export function ActionSheet(props: Props) {
  const styles = useStyles();

  const {
    options,
    cancelButtonIndex,
    actionItemOnPress,
    onClose,
    visible,
    animationType = 'fade',
    transparent = true,
    style,
    ...otherProps
  } = props;

  const { orderedOptions, hasCancelOption } = useMemo(() => {
    const clonedOptions = [...options];
    let cancelItem: (typeof options)[number] | undefined;

    if (
      cancelButtonIndex != null &&
      cancelButtonIndex >= 0 &&
      cancelButtonIndex < clonedOptions.length
    ) {
      [cancelItem] = clonedOptions.splice(cancelButtonIndex, 1);
    }

    if (cancelItem) {
      clonedOptions.push(cancelItem);
    }

    return { orderedOptions: clonedOptions, hasCancelOption: !!cancelItem };
  }, [options, cancelButtonIndex]);

  const firstItemIndex = 0;
  const lastItemNoCancelIndex =
    orderedOptions.length > 0
      ? orderedOptions.length - (hasCancelOption ? 2 : 1)
      : -1;
  const lastItemIndex = hasCancelOption ? orderedOptions.length - 1 : -1;

  const slideAnimation = useRef(new Animated.Value(0)).current;
  const translateY = useMemo(
    () =>
      slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [200, 0],
      }),
    [slideAnimation],
  );

  const slideIn = useCallback(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: ANIMATION_DURATION.s,
      useNativeDriver: true,
    }).start();
  }, [slideAnimation]);

  const slideOut = useCallback(() => {
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: ANIMATION_DURATION.s,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [slideAnimation, onClose]);

  useEffect(() => {
    if (visible) {
      slideIn();
    }
  }, [visible, slideIn]);

  const renderOptions = () => (
    <>
      {orderedOptions.map(({ label, disabled }, index) => (
        <ActionSheetItem
          key={`actionItem-${index}`}
          label={label}
          disabled={disabled}
          onPress={() => {
            !disabled && actionItemOnPress(index);
            !disabled && slideOut();
          }}
          isTop={index === firstItemIndex}
          isBottom={index === lastItemNoCancelIndex}
          isCancelOption={index === lastItemIndex}
        />
      ))}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      {...otherProps}
    >
      <TouchableWithoutFeedback onPressOut={slideOut}>
        <SafeAreaView style={[styles.container, style]}>
          {ios ? (
            <Animated.View
              style={{
                width: '100%',
                transform: [{ translateY }],
              }}
            >
              {renderOptions()}
            </Animated.View>
          ) : (
            renderOptions()
          )}
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    flex: 1,
    justifyContent: ios ? 'flex-end' : 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.m,
    paddingBottom: ios ? spacing.xxxxl : 0,
  },
}));
