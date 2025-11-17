// frontend/src/helpers/resolveUploadUrl.ts
import { discourseHost } from '../constants';

/**
 * Convert Discourse upload URLs (`upload://...`) into absolute URLs.
 * If the URL is already absolute, return it unchanged.
 */
export function resolveUploadUrl(url?: string) {
  if (!url) {
    return url;
  }

  // Check if the URL uses the 'upload://' scheme
  if (url.startsWith('upload://')) {
    // Extract the file identifier from the URL
    const fileName = url.substring('upload://'.length);

    // This is the fix: construct the full, default path that Discourse uses for original uploads.
    // The '1X' is a standard part of the path for these uploads.
    return `${discourseHost}/uploads/default/original/1X/${fileName}`;
  }

  // If it's not an 'upload://' URL, it's probably already a full URL, so return it as is.
  return url;
}