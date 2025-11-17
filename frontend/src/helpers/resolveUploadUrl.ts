import { discourseHost } from '../constants';

/**
 * Convert Discourse upload URLs (`upload://...`) into absolute URLs.
 * If the URL is already absolute, return it unchanged.
 */
export function resolveUploadUrl(url?: string) {
  if (!url) {
    return url;
  }

  if (url.startsWith('upload://')) {
    return `${discourseHost}${url.replace('upload://', '/uploads/')}`;
  }

  return url;
}
