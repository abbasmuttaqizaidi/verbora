import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
]

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Normalizes plain text or HTML into safe HTML paragraphs so both legacy
 * plain-text descriptions and Tiptap HTML render consistently.
 */
export function normalizeToHtml(content: string): string {
  const trimmed = (content || '').trim()
  if (!trimmed) return ''
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed
  }
  return trimmed
    .split(/\n{2,}/)
    .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

/**
 * Sanitizes rich course description HTML for safe rendering with dangerouslySetInnerHTML.
 */
export function sanitizeRichHtml(content: string): string {
  const html = normalizeToHtml(content)
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  })
}

/**
 * Extracts clean plain text from rich HTML for card previews, search, and empty checks.
 */
export function stripHtmlToText(content: string): string {
  if (!content) return ''
  const withSpaces = content
    .replace(/<\/(p|li|h[1-6]|blockquote|div|ul|ol)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
  return withSpaces
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
