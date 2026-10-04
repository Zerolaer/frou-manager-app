import { supabase } from '@/lib/supabaseClient'
import type { ChatRoleMessage } from '@/features/finance/ai/sanitizeChat'
import type { CanvasAiLayout } from './schema'
import { parseCanvasAiLayout } from './schema'

export type CanvasAILayoutRequest = {
  messages: ChatRoleMessage[]
}

export type CanvasAILayoutResponse = {
  reply: string
  layout: CanvasAiLayout | null
  error?: string
}

function asLayoutPayload(data: unknown): CanvasAILayoutResponse {
  if (!data || typeof data !== 'object') {
    return { reply: '', layout: null, error: 'Empty response from AI service' }
  }
  const rec = data as Record<string, unknown>
  if (typeof rec.error === 'string' && rec.error) {
    return { reply: '', layout: null, error: rec.error }
  }
  const layout = parseCanvasAiLayout(rec.layout ?? rec)
  if (!layout) {
    return { reply: '', layout: null, error: 'Could not parse canvas layout' }
  }
  return { reply: layout.reply, layout }
}

async function readJsonBody(res: Response): Promise<{ data: unknown; parseError?: string }> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      data: null,
      parseError: `Empty response from AI service (HTTP ${res.status})`,
    }
  }
  try {
    return { data: JSON.parse(trimmed) as unknown }
  } catch {
    const preview = trimmed.replace(/\s+/g, ' ').slice(0, 180)
    return {
      data: null,
      parseError: `Non-JSON response from AI service (HTTP ${res.status}): ${preview}`,
    }
  }
}

function errorFromPayload(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error?: unknown }).error
    if (typeof err === 'string' && err.trim()) return err
  }
  return fallback
}

function isLocalRouteUnavailable(error: string): boolean {
  return (
    /empty response/i.test(error) ||
    /non-json response/i.test(error) ||
    /HTTP 404/i.test(error) ||
    /failed to fetch/i.test(error) ||
    /networkerror/i.test(error)
  )
}

async function sendViaLocalDevApi(
  request: CanvasAILayoutRequest
): Promise<CanvasAILayoutResponse> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    return { reply: '', layout: null, error: 'Unauthorized' }
  }
  let res: Response
  try {
    res = await fetch('/api/canvas-ai-layout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: request.messages }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch'
    return { reply: '', layout: null, error: `Local AI API unreachable: ${message}` }
  }

  const { data: payloadJson, parseError } = await readJsonBody(res)
  if (parseError) {
    const hint =
      res.status === 404
        ? ' Restart the Vite dev server so /api/canvas-ai-layout is registered.'
        : ''
    return { reply: '', layout: null, error: `${parseError}.${hint}` }
  }
  if (!res.ok) {
    return {
      reply: '',
      layout: null,
      error: errorFromPayload(payloadJson, `Local AI API error: ${res.status}`),
    }
  }
  return asLayoutPayload(payloadJson)
}

function formatEdgeInvokeError(message: string | undefined): string {
  const raw = message || 'Failed to reach AI service'
  if (/failed to send a request/i.test(raw) || /unexpected end of json/i.test(raw)) {
    return 'Сервис Canvas AI временно недоступен. Обратитесь к администратору.'
  }
  return raw
}

async function sendViaSupabaseEdge(
  request: CanvasAILayoutRequest
): Promise<CanvasAILayoutResponse> {
  const { data, error } = await supabase.functions.invoke<unknown>('canvas-ai-layout', {
    body: { messages: request.messages },
  })

  if (error) {
    return { reply: '', layout: null, error: formatEdgeInvokeError(error.message) }
  }
  if (data == null) {
    return { reply: '', layout: null, error: 'Empty response from AI service' }
  }
  return asLayoutPayload(data)
}

function isOpaqueEdgeError(error: string): boolean {
  return (
    /временно недоступен/i.test(error) ||
    /unexpected end of json/i.test(error) ||
    /empty response/i.test(error) ||
    /failed to send a request/i.test(error)
  )
}

export async function sendCanvasAILayout(
  request: CanvasAILayoutRequest
): Promise<CanvasAILayoutResponse> {
  if (import.meta.env.DEV) {
    const local = await sendViaLocalDevApi(request)
    if (!local.error) return local
    const edge = await sendViaSupabaseEdge(request)
    if (!edge.error) return edge
    if (isOpaqueEdgeError(edge.error || '') || isLocalRouteUnavailable(local.error || '')) {
      return local
    }
    return edge
  }
  return sendViaSupabaseEdge(request)
}
