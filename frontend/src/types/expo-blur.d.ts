declare module 'expo-blur' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export type BlurViewProps = ViewProps & {
    tint?: 'light' | 'dark' | 'default';
    intensity?: number;
  };

  export const BlurView: ComponentType<BlurViewProps>;
}

