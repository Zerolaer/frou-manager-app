import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type RequestBody = {
  messages: ChatMessage[]
  snapshot: Record<string, unknown>
  gridContext?: string
  locale?: string
  allowWrites?: boolean
  activeMonthIndex?: number
  systemPrompt?: string
}

function parsePayload(raw: string): { message: string; actions: unknown[] } {
  const trimmed = raw.trim()
  const tryParse = (text: string) => {
    try {
      return JSON.parse(text) as Record<string, unknown>
    } catch {
      return null
    }
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const obj =
    tryParse(fenced?.[1]?.trim() || '') ||
    tryParse(trimmed) ||
    (() => {
      const start = trimmed.indexOf('{')
      const end = trimmed.lastIndexOf('}')
      return start >= 0 && end > start ? tryParse(trimmed.slice(start, end + 1)) : null
    })()
  if (obj && typeof obj === 'object') {
    const message = String(obj.reply ?? obj.message ?? obj.text ?? '').trim()
    const actions = Array.isArray(obj.actions) ? obj.actions : obj.action ? [obj.action] : []
    if (message || actions.length) {
      return { message: message || 'Готово.', actions }
    }
  }
  return { message: trimmed, actions: [] }
}

function buildSystemPrompt(gridContext: string): string {
  return `Ты — финансовый ассистент Frou Manager. Режим: ТОЛЬКО АНАЛИЗ (read-only).

ЯЗЫК (КРИТИЧНО):
- Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке.
- Запрещено отвечать на английском.

ДАННЫЕ:
- «Текущий месяц» = только из блока КАЛЕНДАРЬ, НЕ лучший месяц по расходам (например Октябрь).

ЗАПИСИ В ЯЧЕЙКАХ (КРИТИЧНО):
- included=true / [открыто ✓] / чекбокс включён → запись УЧИТЫВАЕТСЯ в итогах.
- included=false / [закрыто ✗] / чекбокс снят → запись НЕ УЧИТЫВАЕТСЯ — игнорируй при подсчётах.
- Итоги ячеек и сводные суммы уже без закрытых записей.

ДАННЫЕ СЕТКИ:
${gridContext}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          error: 'OPENAI_API_KEY is not configured. Set it in Supabase Edge Function secrets.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = (await req.json()) as RequestBody
    const { messages, snapshot, gridContext, allowWrites = false } = body

    if (!messages?.length || !snapshot) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contextText = gridContext || JSON.stringify(snapshot)
    const systemPrompt = body.systemPrompt?.trim() || buildSystemPrompt(contextText)
    const prelude = allowWrites
      ? [
          { role: 'user', content: 'Подтверди: отвечаешь одним JSON с полями reply и actions, reply только на русском.' },
          { role: 'assistant', content: '{"reply":"Понял. Буду отвечать JSON с reply на русском и actions.","actions":[]}' },
        ]
      : [
          { role: 'user', content: 'Подтверди: будешь отвечать только на русском языке.' },
          { role: 'assistant', content: 'Да, буду отвечать только на русском языке, используя правильный текущий месяц из данных.' },
        ]

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...prelude,
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        temperature: allowWrites ? 0.1 : 0.3,
        max_tokens: 3000,
        ...(allowWrites ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('OpenAI error:', errText)
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openaiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openaiData = await openaiRes.json()
    const raw = openaiData.choices?.[0]?.message?.content ?? ''
    const parsed = allowWrites ? parsePayload(raw) : { message: raw, actions: [] }

    return new Response(JSON.stringify({ message: parsed.message, actions: parsed.actions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('finance-ai-chat error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
