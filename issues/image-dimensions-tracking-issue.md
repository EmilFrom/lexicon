# Image Dimensions Tracking Issue

**Date:** 2025-11-17  
**Status:** 🔴 UNRESOLVED - Callback fires but records not persisted

## Problem Summary
The `after_commit` callback for tracking image dimensions fires successfully (logs show `✓ Tracked dimensions for upload X`), but the database records are NOT being saved to `lexicon_image_dimensions` table.

## Evidence
```
[Lexicon Plugin] ✓ Tracked dimensions for upload 49 in 1.97ms
```
But:
```ruby
Upload.last # => Upload 49
LexiconImageDimension.find_by(upload_id: 49) # => nil ❌
```

## What We've Tried

### 1. ✅ Changed from `DiscourseEvent` to `after_create` callback
- **Result:** Same issue - logs success but no DB entry
- **Reason for failure:** Callback runs inside upload transaction, gets rolled back

### 2. ✅ Changed from `after_create` to `after_commit` callback  
- **Reason:** Suspected transaction rollback
- **Result:** Still not working - callback fires but no persistence
- **Code location:** `discourse-lexicon-plugin/plugin.rb` lines 47-67

### 3. ✅ Manual execution works perfectly
```ruby
upload = Upload.find(48)
LexiconImageDimension.ensure_for_upload(upload)
# ✓ Creates dimension record successfully every time
```

### 4. ✅ Callback is registered correctly
```ruby
Upload._commit_callbacks.select { |cb| cb.filter.to_s.include?('track_lexicon') }
# Returns the callback - it's registered and firing!
```

### 5. ✅ Verified callback execution
```ruby
upload = Upload.find(48)
upload.send(:track_lexicon_image_dimensions)
# ✓ Works and creates dimension record
```

## Current Code
**File:** `discourse-lexicon-plugin/plugin.rb`

```ruby
Upload.class_eval do
  after_commit :track_lexicon_image_dimensions, on: :create
  
  private
  
  def track_lexicon_image_dimensions
    return unless extension.in?(%w[jpg jpeg png gif webp])
    
    # Run in a separate transaction to avoid rollback issues
    ActiveRecord::Base.connection_pool.with_connection do
      # Reload the upload to ensure we have the committed data
      upload = Upload.find_by(id: id)
      return unless upload
      
      DiscourseLexiconPlugin::UploadDimensionTracker.handle_upload_created(upload)
    end
  rescue => e
    Rails.logger.warn("[Lexicon Plugin] Failed to track dimensions for upload #{id}: #{e.message}")
  end
end
```

**File:** `app/events/discourse_lexicon_plugin/upload_dimension_tracker.rb`

```ruby
module DiscourseLexiconPlugin
  class UploadDimensionTracker
    def self.handle_upload_created(upload)
      return unless upload&.id

      # Only track image uploads
      return unless upload.extension.in?(%w[jpg jpeg png gif webp])

      Rails.logger.info("[Lexicon Plugin] Tracking dimensions for upload #{upload.id}: #{upload.url}")
      
      LexiconImageDimension.ensure_for_upload(upload)
    end
  end
end
```

**File:** `app/models/lexicon_image_dimension.rb`

```ruby
def self.ensure_for_upload(upload)
  return nil unless upload&.id && upload.width && upload.height

  find_or_create_by(upload_id: upload.id) do |dim|
    dim.url = upload.url
    dim.width = upload.width
    dim.height = upload.height
    dim.calculate_aspect_ratio # Ensure aspect ratio is calculated on creation
  end
rescue ActiveRecord::RecordInvalid => e
  Rails.logger.warn("[Lexicon Plugin] Failed to create image dimension: #{e.message}")
  nil
end
```

## Hypothesis
The `rescue` block in the callback might be silently catching an error. The success log comes from `UploadDimensionTracker.handle_upload_created`, but something might be failing in `LexiconImageDimension.ensure_for_upload` **without raising an exception**.

Possible causes:
1. **Silent validation failure** - `find_or_create_by` might be failing validation but not raising
2. **Database constraint issue** - Unique constraint or foreign key issue
3. **Transaction isolation** - The `with_connection` block might not be creating a proper new transaction
4. **Timing issue** - The upload might not be fully committed when the callback runs

## Next Steps to Try

### 1. Add Enhanced Logging
Add this to `plugin.rb` callback:

```ruby
def track_lexicon_image_dimensions
  Rails.logger.info("[Lexicon Plugin] 🔍 Callback START for upload #{id}")
  return unless extension.in?(%w[jpg jpeg png gif webp])
  
  Rails.logger.info("[Lexicon Plugin] 🔍 Extension check passed: #{extension}")
  
  ActiveRecord::Base.connection_pool.with_connection do
    upload = Upload.find_by(id: id)
    Rails.logger.info("[Lexicon Plugin] 🔍 Found upload: #{upload.present?} (#{upload&.width}x#{upload&.height})")
    return unless upload
    
    Rails.logger.info("[Lexicon Plugin] 🔍 Calling tracker...")
    result = DiscourseLexiconPlugin::UploadDimensionTracker.handle_upload_created(upload)
    Rails.logger.info("[Lexicon Plugin] 🔍 Tracker result: #{result.inspect}")
    
    # Verify it was saved
    dim = LexiconImageDimension.find_by(upload_id: id)
    Rails.logger.info("[Lexicon Plugin] 🔍 Dimension in DB: #{dim.present?}")
  end
rescue => e
  Rails.logger.error("[Lexicon Plugin] ❌ ERROR: #{e.class} - #{e.message}")
  Rails.logger.error(e.backtrace.first(10).join("\n"))
  raise # Re-raise to see if it's being swallowed elsewhere
end
```

### 2. Check `ensure_for_upload` Return Value
Modify `ensure_for_upload` to log more:

```ruby
def self.ensure_for_upload(upload)
  Rails.logger.info("[Lexicon Plugin] 🔍 ensure_for_upload called for #{upload.id}")
  return nil unless upload&.id && upload.width && upload.height

  Rails.logger.info("[Lexicon Plugin] 🔍 Validations passed, creating/finding...")
  
  result = find_or_create_by(upload_id: upload.id) do |dim|
    Rails.logger.info("[Lexicon Plugin] 🔍 In create block")
    dim.url = upload.url
    dim.width = upload.width
    dim.height = upload.height
    dim.calculate_aspect_ratio
  end
  
  Rails.logger.info("[Lexicon Plugin] 🔍 Result: #{result.inspect}, persisted: #{result.persisted?}")
  result
rescue ActiveRecord::RecordInvalid => e
  Rails.logger.warn("[Lexicon Plugin] Failed to create image dimension: #{e.message}")
  nil
end
```

### 3. Try Background Job Approach
Create a Sidekiq job to completely decouple:

```ruby
# app/jobs/regular/track_upload_dimensions.rb
module Jobs
  class TrackUploadDimensions < ::Jobs::Base
    def execute(args)
      upload_id = args[:upload_id]
      upload = Upload.find_by(id: upload_id)
      return unless upload
      
      LexiconImageDimension.ensure_for_upload(upload)
    end
  end
end

# In plugin.rb
Upload.class_eval do
  after_commit :enqueue_dimension_tracking, on: :create
  
  private
  
  def enqueue_dimension_tracking
    return unless extension.in?(%w[jpg jpeg png gif webp])
    Jobs.enqueue(:track_upload_dimensions, upload_id: id)
  end
end
```

### 4. Check Database Constraints
```sql
-- Check for any constraints that might be failing silently
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'lexicon_image_dimensions'::regclass;

-- Check for any failed inserts
SELECT * FROM pg_stat_user_tables WHERE relname = 'lexicon_image_dimensions';
```

### 5. Try Direct ActiveRecord Without Helper
In the callback, try creating directly:

```ruby
def track_lexicon_image_dimensions
  return unless extension.in?(%w[jpg jpeg png gif webp])
  
  upload = Upload.find_by(id: id)
  return unless upload&.width && upload&.height
  
  # Direct creation without helper method
  LexiconImageDimension.create!(
    upload_id: upload.id,
    url: upload.url,
    width: upload.width,
    height: upload.height,
    aspect_ratio: upload.width.to_f / upload.height.to_f
  )
rescue ActiveRecord::RecordNotUnique
  Rails.logger.info("[Lexicon Plugin] Dimension already exists for upload #{id}")
rescue => e
  Rails.logger.error("[Lexicon Plugin] Failed: #{e.class} - #{e.message}")
  raise
end
```

## Test Commands

### Check Last Upload
```ruby
u = Upload.last
puts "Upload #{u.id}: #{u.width}x#{u.height}"
puts "Extension: #{u.extension}"
```

### Check Dimension
```ruby
d = LexiconImageDimension.find_by(upload_id: u.id)
puts d ? "✓ Found: #{d.inspect}" : "✗ Missing"
```

### Manual Test (This Always Works!)
```ruby
u = Upload.last
result = LexiconImageDimension.ensure_for_upload(u)
puts "Result: #{result.inspect}"
puts "Persisted: #{result.persisted?}"
```

### Watch Logs During Upload
```bash
tail -f /var/www/discourse/log/production.log | grep -i "lexicon\|upload"
```

### SQL Check
```sql
-- Get recent uploads and their dimensions
SELECT 
  u.id, 
  u.extension, 
  u.width, 
  u.height,
  u.created_at as upload_time,
  d.id as dim_id,
  d.aspect_ratio,
  d.created_at as dim_time
FROM uploads u
LEFT JOIN lexicon_image_dimensions d ON d.upload_id = u.id
WHERE u.extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
ORDER BY u.id DESC
LIMIT 5;
```

## Working Uploads (Manual Creation)
- Upload 44: ✅ Dimension created manually
- Upload 48: ✅ Dimension created manually (ID 5)

## Failed Uploads (Automatic Callback)
- Upload 46: ❌ No dimension (callback fired)
- Upload 47: ❌ No dimension (callback fired)
- Upload 49: ❌ No dimension (callback fired)

## Key Observations
1. **Manual execution always works** - The model and database are fine
2. **Callback is registered and fires** - The hook is working
3. **Logs show success** - But DB shows nothing
4. **No errors in logs** - Something is failing silently

## Conclusion
This is a very unusual issue where:
- ✅ The callback fires
- ✅ The log says success
- ❌ But nothing is saved to the database

The most likely cause is that `find_or_create_by` is returning an existing record (that doesn't actually exist) or failing validation silently. The enhanced logging in "Next Steps" should reveal the exact point of failure.

## Files to Check
- `discourse-lexicon-plugin/plugin.rb` (lines 47-67)
- `discourse-lexicon-plugin/app/models/lexicon_image_dimension.rb`
- `discourse-lexicon-plugin/app/events/discourse_lexicon_plugin/upload_dimension_tracker.rb`
- `discourse-lexicon-plugin/db/migrate/20251116000001_create_lexicon_image_dimensions.rb`

## Related Git Commits
- `37b96d2` - fix: Use after_commit for image dimension tracking
- Previous commits implementing the feature

---

**Status Update:** Need to add enhanced logging and investigate why `ensure_for_upload` succeeds in logs but doesn't persist to database. 🔍

