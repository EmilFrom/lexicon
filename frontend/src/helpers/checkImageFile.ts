export function isImageValidUrl(imageUri: string) {
  const imageRegex = /([^\s]+(\.(jpe?g|png|gif|heic|heif))$)/g;
  return imageRegex.test(imageUri);
}
