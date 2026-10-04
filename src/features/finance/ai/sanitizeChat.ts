const MAX_MESSAGES = 20
const MAX_CONTENT_CHARS = 4000

export type ChatRoleMessage = { role: 'user' | 'assistant'; content: string }

export function sanitizeFinanceChatMessages(input: unknown): ChatRoleMessage[] {
  if (!Array.isArray(input)) return []
  const out: ChatRoleMessage[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const role = (item as { role?: string }).role
    const content = (item as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string' || !content.trim()) continue
    out.push({ role, content: content.slice(0, MAX_CONTENT_CHARS) })
    if (out.length >= MAX_MESSAGES) break
  }
  return out
}

const rateBuckets = new Map<string, number[]>()

export function consumeAiRateLimit(userId: string, maxPerWindow = 20, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
  const prev = rateBuckets.get(userId) ?? []
  const recent = prev.filter((t) => now - t < windowMs)
  if (recent.length >= maxPerWindow) {
    rateBuckets.set(userId, recent)
    return false
  }
  recent.push(now)
  rateBuckets.set(userId, recent)
  return true
}
