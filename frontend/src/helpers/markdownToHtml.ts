import MarkdownIt from 'markdown-it';

// Initialize the parser once and reuse it for better performance.
const md = new MarkdownIt({ html: true });

/**
 * Converts a Markdown string to an HTML string.
 * @param markdown The raw Markdown content.
 * @returns An HTML string.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return md.render(markdown);
}
