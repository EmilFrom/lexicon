# Implementation Guide: Optimized Image Handling

## Overview
This guide details the steps to fix the image dimension fetching issues and implement a "smart" image loading strategy.

**The Problem:**
1.  **Backend:** The plugin fails to find image dimensions because the app sends absolute URLs (e.g., `https://...`) while the database stores relative paths (e.g., `/uploads/...`), and the app requests "optimized" (thumbnail) URLs which aren't in the main `Uploads` table.
2.  **Frontend:** The app displays images using whatever URL it finds first (often the optimized one). When a user taps to zoom, they still see the low-res optimized version instead of the full-quality original.

**The Solution:**
1.  **Backend:** Update the plugin to "clean" the incoming URLs (remove the `https://domain` part) and look up dimensions in the `OptimizedImage` table if the main `Upload` lookup fails.
2.  **Frontend:**
    *   Continue using optimized URLs in the feed (PostItem) and Carousel for performance.
    *   Create a helper function to "upgrade" an optimized URL to its original high-res version.
    *   Use this helper when the user taps an image, so the Fullscreen Modal shows the high-quality version.

---

## Part 1: Backend Updates (Discourse Plugin)

### Step 1: Update `LexiconImageDimension.rb`
**File:** `discourse-lexicon-plugin/app/models/lexicon_image_dimension.rb`

Replace the **entire file content** with the following code. This adds the logic to strip hostnames and check the `OptimizedImage` table.

```ruby
# frozen_string_literal: true

class LexiconImageDimension < ActiveRecord::Base
  belongs_to :upload

  validates :upload_id, presence: true, uniqueness: true
  validates :url, presence: true
  validates :width, presence: true, numericality: { greater_than: 0 }
  validates :height, presence: true, numericality: { greater_than: 0 }
  validates :aspect_ratio, presence: true, numericality: { greater_than: 0 }

  before_validation :calculate_aspect_ratio

  # Find or create with lazy fallback from Upload record
  def self.ensure_for_upload(upload)
    return nil unless upload&.id && upload.width.present? && upload.height.present?

    dimension = find_or_initialize_by(upload_id: upload.id)
    dimension.url = upload.url
    dimension.width = upload.width
    dimension.height = upload.height

    if dimension.save
      # Rails.logger.info("[Lexicon Plugin] Saved image dimension for upload #{upload.id}")
      dimension
    else
      # Rails.logger.warn("[Lexicon Plugin] Failed to persist dimensions: #{dimension.errors.full_messages.to_sentence}")
      nil
    end
  rescue => e
    Rails.logger.error("[Lexicon Plugin] Error in ensure_for_upload: #{e.message}")
    nil
  end

  # Lazy lookup with fallback to Upload table and OptimizedImage table
  def self.dimension_for_url(url)
    return nil if url.blank?

    # 1. Normalize URL: Create a relative version (strip protocol/host)
    #    Input: https://site.com/uploads/default/img.jpg -> Output: /uploads/default/img.jpg
    relative_url = url.sub(/^https?:\/\/[^\/]+/, '')

    # 2. Try Lexicon Cache (Check both absolute and relative keys)
    dimension = find_by(url: url) || find_by(url: relative_url)
    return format_dimension(dimension, url) if dimension

    # 3. Fallback: Try Upload Table (The original image)
    upload = Upload.find_by(url: relative_url) || Upload.find_by(url: url)
    if upload && upload.width && upload.height
      dimension = ensure_for_upload(upload)
      return format_dimension(dimension, url) if dimension
    end

    # 4. Fallback: Try OptimizedImage Table (Thumbnails/Resized versions)
    #    The frontend often requests optimized URLs which aren't in the 'uploads' table.
    optimized = OptimizedImage.find_by(url: relative_url) || OptimizedImage.find_by(url: url)
    if optimized && optimized.width && optimized.height
      # We calculate aspect ratio on the fly for optimized images
      return {
        url: url, # Return the requested URL so the frontend map key matches
        width: optimized.width,
        height: optimized.height,
        aspectRatio: optimized.width.to_f / optimized.height.to_f
      }
    end

    nil
  end

  # Bulk lookup
  def self.dimensions_for_urls(urls)
    return {} if urls.blank?

    # We don't strictly need Rails cache here if we want fresh data during debug,
    # but keeping it for performance is good.
    cache_key = "lexicon_image_dims:#{Digest::MD5.hexdigest(urls.sort.join(','))}"
    
    Rails.cache.fetch(cache_key, expires_in: 10.minutes) do
      result = {}

      urls.each do |url|
        # Perform the smart lookup defined above
        dims = dimension_for_url(url)
        result[url] = dims if dims
      end

      result
    end
  end

  private

  def calculate_aspect_ratio
    self.aspect_ratio = width.to_f / height.to_f if width && height && height > 0
  end

  def self.format_dimension(dim, requested_url = nil)
    return nil unless dim
    {
      url: requested_url || dim.url, # Use the requested URL to ensure map keys match
      width: dim.width,
      height: dim.height,
      aspectRatio: dim.aspect_ratio
    }
  end
end
```

### Step 2: Restart Server
You **must** restart the Rails server for these changes to take effect.

---

## Part 2: Frontend Updates (Lexicon App)

### Step 3: Add URL Helper
**File:** `src/helpers/convertUrl.ts`

Add the `getOriginalImageUrl` function to the end of this file. This function detects optimized URLs and converts them to the original format.

```typescript
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
```

### Step 4: Update ImageCarousel
**File:** `src/components/ImageCarousel.tsx`

We need to update the `ImageCarousel` to use this new helper when an image is pressed.

1.  **Import the helper:**
    ```typescript
    import { getOriginalImageUrl } from '../helpers/convertUrl';
    ```

2.  **Update the `onPress` handler:**
    Change the `AuthenticatedImage`'s `onPress` prop.

    **Find this block:**
    ```typescript
    <AuthenticatedImage
      url={url}
      onPress={() => onImagePress(url)}
      // ...
    />
    ```

    **Replace with this:**
    ```typescript
    <AuthenticatedImage
      url={url}
      onPress={() => {
        const originalUrl = getOriginalImageUrl(url);
        onImagePress(originalUrl);
      }}
      // ...
    />
    ```

### Step 5: Verify PostItem (No changes needed)
**File:** `src/components/PostItem/PostItem.tsx`

Double-check that `PostItem` is correctly passing `setFullScreenImage` to the carousel.

```typescript
// This looks correct in the current file:
<ImageCarousel
  images={images}
  onImagePress={(uri) => setFullScreenImage(uri)}
  imageDimensionsMap={finalDimensionsMap} 
/>
```
Because `ImageCarousel` now sends the "upgraded" URL, `setFullScreenImage` will receive the high-res URL, and the `FullScreenImageModal` will display the high-quality image.

## Verification Checklist
1.  **Restart Backend:** Did you restart the Rails server?
2.  **Reload App:** Reload the React Native app.
3.  **Check Logs:** You should no longer see empty keys in the API response logs for optimized images.
4.  **Visual Check:**
    *   Feed images should load (using optimized URLs).
    *   Tapping an image should open the modal with the crisp, high-resolution version.
