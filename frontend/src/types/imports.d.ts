declare module '*.jpg';
declare module '*.png';

declare module '*.svg' {
  import { SvgProps } from 'react-native-svg';
  const Component: React.FC<SvgProps>;
  export default Component;
}

declare module 'react-native-console-time-polyfill';
