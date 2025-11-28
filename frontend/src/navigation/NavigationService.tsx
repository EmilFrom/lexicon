import {
  createNavigationContainerRef,
  NavigationState,
  PartialState,
} from '@react-navigation/native';

import { RootStackParamList, RootStackRouteName } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(
  params:
    | [screen: RootStackRouteName]
    | [
        screen: RootStackRouteName,
        params: RootStackParamList[RootStackRouteName],
      ],
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - TypeScript cannot properly narrow the union type for spread parameters
    navigationRef.navigate(...params);
  }
}
export function reset(
  params:
    | PartialState<NavigationState<RootStackParamList>>
    | NavigationState<RootStackParamList>,
) {
  if (navigationRef.isReady()) {
    navigationRef.reset(params);
  }
}
