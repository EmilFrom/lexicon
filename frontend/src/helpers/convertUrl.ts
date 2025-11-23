export function isProtocolRelativeUrl(url: string) {
  const regex = /^\/\/[^/].*$/;
  return regex.test(url);
}

/**
 * This function is used to convert protocolRelativeUrl into absolute url
 * ex: //example.com
 * into: https://example.com
 *
 * @param url string
 * @returns string of url
 */

export function convertUrl(url: string) {
  return isProtocolRelativeUrl(url) ? `https:${url}` : url;
}

/**
 * Attempts to convert a Discourse optimized image URL to its original version.
 *
 * Logic:
 * 1. Replace '/optimized/' with '/original/'
 * 2. Remove the resolution suffix (e.g., '_2_690x388') before the extension.
 */
export function getOriginalImageUrl(url: string): string {
  if (!url) return '';

  // Check if it is an optimized URL
  if (url.includes('/optimized/')) {
    let newUrl = url.replace('/optimized/', '/original/');

    // Regex to remove Discourse optimization suffix (e.g. _2_1024x768)
    // Looks for underscore, digit, underscore, digits, 'x', digits, before the dot extension
    // Example: name_2_690x388.jpeg -> name.jpeg
    newUrl = newUrl.replace(/_\d+_\d+x\d+(?=\.[a-zA-Z]+$)/, '');

    return newUrl;
  }

  return url;
}
