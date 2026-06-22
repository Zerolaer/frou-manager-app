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
    const { messages, snapshot, gridContext, locale = 'ru' } = body

    if (!messages?.length || !snapshot) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contextText = gridContext || JSON.stringify(snapshot)
    const systemPrompt = buildSystemPrompt(contextText)

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Подтверди: будешь отвечать только на русском языке.' },
      { role: 'assistant', content: 'Да, буду отвечать только на русском языке, используя правильный текущий месяц из данных.' },
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
        temperature: 0.3,
        max_tokens: 3000,
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
    const message = openaiData.choices?.[0]?.message?.content ?? ''

    return new Response(JSON.stringify({ message }), {
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
