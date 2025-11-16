import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

import { getDiscourseAuthHeaders } from './discourseAuthHeaders';

const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}authenticated-images/`;
const CACHE_METADATA_KEY = '@image_cache_metadata';
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024; // 100MB in bytes

interface CacheMetadata {
  [cacheKey: string]: {
    url: string;
    localUri: string;
    downloadedAt: number;
    size: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

interface CacheConfig {
  maxAge?: number;
  maxSize?: number;
}

class ImageCacheManager {
  private metadata: CacheMetadata = {};
  private initialized = false;

  async initialize() {
    if (this.initialized) {
      return;
    }

    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, {
        intermediates: true,
      });
    }

    // Load metadata
    try {
      const metadataJson = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadataJson) {
        this.metadata = JSON.parse(metadataJson);
      }
    } catch (error) {
      console.warn('[ImageCache] Failed to load metadata:', error);
      this.metadata = {};
    }

    this.initialized = true;
  }

  private async saveMetadata() {
    try {
      await AsyncStorage.setItem(
        CACHE_METADATA_KEY,
        JSON.stringify(this.metadata),
      );
    } catch (error) {
      console.warn('[ImageCache] Failed to save metadata:', error);
    }
  }

  private async generateCacheKey(url: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url,
    );
    return hash;
  }

  async getCachedImage(
    url: string,
    config: CacheConfig = {},
  ): Promise<string | null> {
    await this.initialize();

    const cacheKey = await this.generateCacheKey(url);
    const entry = this.metadata[cacheKey];

    if (!entry) {
      return null;
    }

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
    if (!fileInfo.exists) {
      // Clean up stale metadata
      delete this.metadata[cacheKey];
      await this.saveMetadata();
      return null;
    }

    // Check if cache is expired
    const maxAge = config.maxAge ?? DEFAULT_MAX_AGE;
    const age = Date.now() - entry.downloadedAt;
    if (age > maxAge) {
      // Cache expired, delete file and metadata
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
      delete this.metadata[cacheKey];
      await this.saveMetadata();
      return null;
    }

    return entry.localUri;
  }

  async downloadAndCacheImage(
    url: string,
    token: string | null,
    config: CacheConfig = {},
  ): Promise<string> {
    await this.initialize();

    const cacheKey = await this.generateCacheKey(url);
    const fileExtension = this.getFileExtension(url);
    const localUri = `${CACHE_DIRECTORY}${cacheKey}${fileExtension}`;

    // Download with authentication headers
    const headers = getDiscourseAuthHeaders(token);
    
    if (__DEV__) {
      console.log('[ImageCache] Downloading:', {
        url,
        localUri,
        headers: Object.keys(headers),
        hasToken: !!token,
      });
    }

    const downloadResult = await FileSystem.downloadAsync(url, localUri, {
      headers,
    });

    if (__DEV__) {
      console.log('[ImageCache] Download result:', {
        url,
        status: downloadResult.status,
        headers: downloadResult.headers,
      });
    }

    if (downloadResult.status !== 200) {
      throw new Error(
        `Failed to download image: HTTP ${downloadResult.status}`,
      );
    }

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

    // Get image dimensions
    const dimensions = await this.getImageDimensions(localUri);

    // Update metadata
    this.metadata[cacheKey] = {
      url,
      localUri,
      downloadedAt: Date.now(),
      size,
      dimensions,
    };
    await this.saveMetadata();

    // Check if we need to clean up old files
    await this.cleanupIfNeeded(config);

    return localUri;
  }

  private getFileExtension(url: string): string {
    const match = url.match(/\.(jpeg|jpg|png|gif|webp)(\?|$)/i);
    return match ? `.${match[1].toLowerCase()}` : '.jpg';
  }

  private async getImageDimensions(
    uri: string,
  ): Promise<{ width: number; height: number } | undefined> {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          console.warn('[ImageCache] Failed to get image dimensions:', error);
          resolve(undefined);
        },
      );
    });
  }

  async getCachedImageDimensions(
    url: string,
  ): Promise<{ width: number; height: number } | undefined> {
    await this.initialize();
    const cacheKey = await this.generateCacheKey(url);
    const entry = this.metadata[cacheKey];
    return entry?.dimensions;
  }

  private async cleanupIfNeeded(config: CacheConfig = {}) {
    const maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
    const totalSize = Object.values(this.metadata).reduce(
      (sum, entry) => sum + entry.size,
      0,
    );

    if (totalSize <= maxSize) {
      return;
    }

    // Sort by age (oldest first)
    const entries = Object.entries(this.metadata).sort(
      ([, a], [, b]) => a.downloadedAt - b.downloadedAt,
    );

    let currentSize = totalSize;
    const targetSize = maxSize * 0.8; // Clean up to 80% of max size

    for (const [cacheKey, entry] of entries) {
      if (currentSize <= targetSize) {
        break;
      }

      try {
        await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        currentSize -= entry.size;
        delete this.metadata[cacheKey];
      } catch (error) {
        console.warn('[ImageCache] Failed to delete file:', error);
      }
    }

    await this.saveMetadata();
  }

  async clearExpiredCache(maxAge: number = DEFAULT_MAX_AGE) {
    await this.initialize();

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [cacheKey, entry] of Object.entries(this.metadata)) {
      const age = now - entry.downloadedAt;
      if (age > maxAge) {
        expiredKeys.push(cacheKey);
        try {
          await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        } catch (error) {
          console.warn('[ImageCache] Failed to delete expired file:', error);
        }
      }
    }

    for (const key of expiredKeys) {
      delete this.metadata[key];
    }

    if (expiredKeys.length > 0) {
      await this.saveMetadata();
    }

    return expiredKeys.length;
  }

  async clearAllCache() {
    await this.initialize();

    try {
      await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, {
        intermediates: true,
      });
      this.metadata = {};
      await this.saveMetadata();
    } catch (error) {
      console.warn('[ImageCache] Failed to clear cache:', error);
    }
  }

  async getCacheStats() {
    await this.initialize();

    const entries = Object.values(this.metadata);
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const count = entries.length;
    const oldestTimestamp = entries.length
      ? Math.min(...entries.map((e) => e.downloadedAt))
      : null;
    const newestTimestamp = entries.length
      ? Math.max(...entries.map((e) => e.downloadedAt))
      : null;

    return {
      count,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      oldestTimestamp,
      newestTimestamp,
    };
  }
}

// Singleton instance
export const imageCacheManager = new ImageCacheManager();

