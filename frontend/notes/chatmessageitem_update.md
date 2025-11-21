// ... imports
import { useImageDimensions } from '../../../hooks/useImageDimensions'; // Import your dimension hook

export function ChatMessageItem(props: Props) {
  // ... existing code ...
  const { id, time, markdownContent } = content;

  // 1. Extract Images from Markdown (Logic already exists)
  const { filteredMarkdown } = filterMarkdownContentPoll(markdownContent || '');
  
  // 2. Get URLs for ImageCarousel
  const images = getCompleteImageVideoUrls(filteredMarkdown)?.filter(Boolean) as string[] || [];
  
  // 3. Fetch Dynamic Dimensions (Reuse your new logic!)
  const { dimensions } = useImageDimensions(images);

  // 4. Refined Logic for "Unsupported"
  // Only show unsupported box if there are uploads that are NOT images
  const unsupported = 'uploads' in content 
    ? content.uploads.filter(u => {
        // Check if this upload is represented in the images array we extracted
        // OR check file extension if you added that field to GraphQL
        const isImage = u.url && (
           u.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || 
           images.some(img => img.includes(u.url))
        );
        return !isImage; 
      }).length > 0
    : false;

  // ... existing render code ...

  const renderMessageContent = () => (
    <>
      <MarkdownRenderer
        fontColor={automaticFontColor(colors.backgroundDarker)}
        content={markdownContentScene}
      />
      {images.length > 0 && (
        <ImageCarousel
          images={images}
          onImagePress={(uri) => setFullScreenImage(uri)}
          imageDimensionsMap={dimensions} // <--- Pass dimensions here
        />
      )}
      {unsupported && renderUnsupported()}
    </>
  );

  // ... rest of file