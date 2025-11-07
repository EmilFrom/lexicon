// in imagePickerHandler.ts

import { Alert } from 'react-native';
import { pickImage } from './pickImage';
import { t } from '../i18n/translate'; // The correct import

export async function imagePickerHandler(
  extensions?: Array<string>,
): Promise<{ uri: string } | null> {
  const stringifyExtensions = extensions?.join(', ');

  const result = await pickImage(extensions);

  if (!result) {
    return null;
  }

  if ('error' in result) {
    switch (result.error) {
      case 'format': {
        Alert.alert(
          t('Failed!'),
          // The custom t function uses curly braces for interpolation
          t('Please upload image with a suitable format in {extensions}', {
            extensions: stringifyExtensions,
          }),
          [{ text: t('Got it') }],
        );
        break;
      }
      case 'denied': {
        Alert.alert(
          t('Photo Permissions Required'),
          t(
            `Please adjust your phone's settings to allow the app to access your photos.`,
          ),
          [{ text: t('Got it') }],
        );
        break;
      }
      case 'cancelled': {
        break;
      }
    }
    return null;
  }

  return result;
}
