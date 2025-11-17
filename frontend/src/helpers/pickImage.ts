import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { getFormat } from './getFormat';

// Define a consistent return type for this helper function
type PickImageResult =
  | { uri: string }
  | { error: 'denied' | 'cancelled' | 'format' };

export async function pickImage(
  extensions?: Array<string>,
): Promise<PickImageResult | null> {
  // 1. Request permissions first. The new API returns a more detailed object.
  const permissionResult =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    // The user has explicitly denied permissions.
    return {
      error: 'denied',
    };
  }

  // 2. Define the options for the image picker.
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: 1,
    // The modern API supports 'allowsMultipleSelection', but the old code's logic
    // was designed for a single image, so we keep it that way.
    allowsMultipleSelection: false,
  };

  // 3. Launch the image library.
  const result = await ImagePicker.launchImageLibraryAsync(options);

  // 4. The modern API has a much simpler cancellation check.
  //    The 'getPendingResultAsync' workaround is no longer needed.
  if (result.canceled) {
    return {
      error: 'cancelled',
    };
  }

  // 5. If not cancelled, the 'assets' array is guaranteed to have at least one item.
  //    The old logic for checking !result.assets.length is redundant.
  const firstAsset = result.assets[0];

  const manipulatedImage = await ImageManipulator.manipulateAsync(
    firstAsset.uri,
    [],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  // 6. Perform the format validation.
  const format = getFormat(manipulatedImage.uri);
  if (extensions && !extensions.includes(format)) {
    return {
      error: 'format',
    };
  }

  // 7. Return the URI in the expected object format.
  return {
    uri: manipulatedImage.uri,
  };
}
