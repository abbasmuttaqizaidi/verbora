import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import {
  Bold,
  Italic,
  Underline,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RemoveFormatting,
} from 'lucide-react'

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

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

/**
 * Free MIT-licensed Tiptap WYSIWYG rich text editor for course descriptions.
 */
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
    ],
    content: normalizeToHtml(value),
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prose-input',
      },
    },
  })

  if (!editor) {
    return (
      <div className="tiptap-editor-wrap">
        <div className="tiptap-editor-content" style={{ minHeight: 150, color: '#94a3b8', fontSize: 13 }}>
          Loading editor...
        </div>
      </div>
    )
  }

  return (
    <div className="tiptap-editor-wrap">
      <div className="tiptap-toolbar" role="toolbar" aria-label="Course description formatting">
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
          aria-label="Underline"
        >
          <Underline size={15} />
        </button>

        <span className="tiptap-toolbar-sep" aria-hidden="true" />

        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Subheading"
          aria-label="Subheading"
        >
          <Heading3 size={15} />
        </button>
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          className={`tiptap-toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Highlight Quote"
          aria-label="Quote"
        >
          <Quote size={15} />
        </button>

        <span className="tiptap-toolbar-sep" aria-hidden="true" />

        <button
          type="button"
          className="tiptap-toolbar-btn"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
          aria-label="Clear Formatting"
        >
          <RemoveFormatting size={15} />
        </button>
        <button
          type="button"
          className="tiptap-toolbar-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          className="tiptap-toolbar-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>
      </div>

      <EditorContent editor={editor} className="tiptap-editor-content" />
    </div>
  )
}
