import { supabase } from '@/lib/supabaseClient'
import { buildFinanceAITextContext } from '@/features/finance/ai/context'
import type { FinanceAIChatRequest, FinanceAIChatResponse } from '@/features/finance/ai/types'

function enrichRequest(request: FinanceAIChatRequest): FinanceAIChatRequest {
  const locale = 'ru'
  return {
    ...request,
    locale,
    gridContext: request.gridContext ?? buildFinanceAITextContext(request.snapshot, locale),
  }
}

async function sendViaLocalDevApi(request: FinanceAIChatRequest): Promise<FinanceAIChatResponse> {
  const payload = enrichRequest(request)
  const res = await fetch('/api/finance-ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as FinanceAIChatResponse

  if (!res.ok) {
    return { message: '', error: data.error || `Local AI API error: ${res.status}` }
  }

  return data
}

function formatEdgeInvokeError(message: string | undefined): string {
  const raw = message || 'Failed to reach AI service'
  // Supabase JS when the function URL 404s (never deployed) or the gateway is unreachable
  if (/failed to send a request/i.test(raw)) {
    return 'Сервис Finance AI временно недоступен. Обратитесь к администратору.'
  }
  return raw
}

async function sendViaSupabaseEdge(request: FinanceAIChatRequest): Promise<FinanceAIChatResponse> {
  const payload = enrichRequest(request)
  const { data, error } = await supabase.functions.invoke<FinanceAIChatResponse>('finance-ai-chat', {
    body: payload,
  })

  if (error) {
    return {
      message: '',
      error: formatEdgeInvokeError(error.message),
    }
  }

  if (!data) {
    return { message: '', error: 'Empty response from AI service' }
  }

  if (data.error) {
    return { message: '', error: data.error }
  }

  return data
}

export async function sendFinanceAIChat(request: FinanceAIChatRequest): Promise<FinanceAIChatResponse> {
  if (import.meta.env.DEV) {
    const local = await sendViaLocalDevApi(request)
    if (!local.error) return local
    // Fallback to edge function if local dev API is unavailable
    return sendViaSupabaseEdge(request)
  }

  return sendViaSupabaseEdge(request)
}
