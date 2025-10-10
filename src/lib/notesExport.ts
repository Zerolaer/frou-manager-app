import type { Note } from '@/features/notes/types'
import { downloadFile } from '@/lib/financeExport'

/**
 * Export notes to JSON
 */
export function exportNotesToJSON(notes: Note[]): string {
  const data = {
    exportDate: new Date().toISOString(),
    notesCount: notes.length,
    notes: notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      folder_id: note.folder_id,
      pinned: note.pinned,
      created_at: note.created_at,
      updated_at: note.updated_at
    }))
  }
  
  return JSON.stringify(data, null, 2)
}

/**
 * Export notes to Markdown
 */
export function exportNotesToMarkdown(notes: Note[]): string {
  let markdown = `# Notes Export\n\n`
  markdown += `*Exported on: ${new Date().toLocaleString()}*\n\n`
  markdown += `*Total notes: ${notes.length}*\n\n`
  markdown += `---\n\n`
  
  notes.forEach((note, index) => {
    markdown += `## ${index + 1}. ${note.title}\n\n`
    
    if (note.pinned) {
      markdown += `📌 *Pinned*\n\n`
    }
    
    markdown += `${note.content || '*No content*'}\n\n`
    
    markdown += `<small>Created: ${new Date(note.created_at).toLocaleString()}</small>\n\n`
    
    markdown += `---\n\n`
  })
  
  return markdown
}

/**
 * Export notes with download
 */
export function downloadNotes(notes: Note[], format: 'json' | 'markdown') {
  const timestamp = new Date().toISOString().slice(0, 10)
  
  if (format === 'json') {
    const jsonData = exportNotesToJSON(notes)
    downloadFile(jsonData, `notes-${timestamp}.json`, 'application/json')
  } else {
    const markdownData = exportNotesToMarkdown(notes)
    downloadFile(markdownData, `notes-${timestamp}.md`, 'text/markdown')
  }
}

