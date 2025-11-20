# Guide: Fixing "Missing Image Dimensions" (ELI5)

## The Problem
The app is asking the server for image sizes (dimensions), but the server is saying "I don't know that image!" This happens because:
1.  **The app asks for "Optimized" images:** The app finds thumbnails (optimized versions) in the text, like `image_2_500x500.jpg`.
2.  **The server only looks for "Original" images:** The server's plugin was only checking its "Uploads" list (original files), not the "Optimized" list (thumbnails).
3.  **URL Confusion:** The app sends full web addresses (`https://site.com/image.jpg`), but the server stores them as relative paths (`/image.jpg`).

## The Fix
We will teach the server to look in the "Optimized" list and ignore the `https://site.com` part. We will also teach the app how to find the original high-quality image when you click on a thumbnail.

---

## Step 1: Fix the Server (Ruby Plugin)
We need to update the logic in the Discourse plugin.

**File:** `discourse-lexicon-plugin/app/models/lexicon_image_dimension.rb`

**Action:** Replace the **entire content** of this file with the code below.

**What's new?**
*   It strips `https://domain` to match relative paths.
*   It checks the `OptimizedImage` database table if the `Upload` table doesn't have the image.

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

### IMPORTANT: Restart the Server!
After changing this file, you **must** restart your Discourse server (e.g., `rails s` or restart the container) for the changes to work.

---

## Step 2: Add the "URL Upgrader" Tool (Frontend)
We need a small tool to turn a "thumbnail URL" into an "original URL" so users can see the high-quality version when they zoom in.

**File:** `src/helpers/convertUrl.ts`

**Action:** Add this new function to the bottom of the file.

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

---

## Step 3: Update the Image Carousel (Frontend)
Now we tell the Carousel to use our new tool. When a user taps an image, we "upgrade" the URL before showing the full-screen modal.

**File:** `src/components/ImageCarousel.tsx`

**Action 1: Add Import**
Add this line to the top imports:
```typescript
import { getOriginalImageUrl } from '../helpers/convertUrl';
```

**Action 2: Update the `AuthenticatedImage` inside the loop**
Find where `<AuthenticatedImage ... />` is used. Change the `onPress` part.

**Old Code:**
```typescript
<AuthenticatedImage
  url={url}
  onPress={() => onImagePress(url)}
  // ... other props
/>
```

**New Code:**
```typescript
<AuthenticatedImage
  url={url}
  onPress={() => {
    const originalUrl = getOriginalImageUrl(url); // <--- NEW: Convert to HD
    onImagePress(originalUrl);
  }}
  // ... other props
/>
```

---

## Summary
1.  **Server:** Now understands "Optimized" images and relative paths.
2.  **Helper:** Can convert "Optimized" -> "Original".
3.  **App:** Shows fast thumbnails in the feed, but loads HD images when you tap.
