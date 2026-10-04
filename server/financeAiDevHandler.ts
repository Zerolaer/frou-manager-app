import type { IncomingMessage, ServerResponse } from 'http'
import { createClient } from '@supabase/supabase-js'
import { parseFinanceAIPayload } from '../src/features/finance/ai/parse'
import { buildFinanceAISystemPrompt } from '../src/features/finance/ai/context'
import { consumeAiRateLimit, sanitizeFinanceChatMessages } from '../src/features/finance/ai/sanitizeChat'
import type { FinanceSnapshot } from '../src/features/finance/ai/types'

const MAX_BODY_BYTES = 400_000

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer | string) => {
      data += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? (JSON.parse(data) as Record<string, unknown>) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export async function handleFinanceAiChat(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    res.end()
    return
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    json(res, 401, { error: 'Missing authorization' })
    return
  }

  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    json(res, 503, { error: 'Supabase env is not configured' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    json(res, 401, { error: 'Unauthorized' })
    return
  }

  if (!consumeAiRateLimit(authData.user.id)) {
    json(res, 429, { error: 'Too many AI requests' })
    return
  }

  const openaiKey = env.OPENAI_API_KEY
  if (!openaiKey) {
    json(res, 503, { error: 'OPENAI_API_KEY is not set in .env.local' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const messages = sanitizeFinanceChatMessages(body.messages)
    const snapshot = body.snapshot as FinanceSnapshot | undefined
    const allowWrites = body.allowWrites === true
    const activeMonthIndex = typeof body.activeMonthIndex === 'number' ? body.activeMonthIndex : undefined

    if (!messages.length || !snapshot) {
      json(res, 400, { error: 'Invalid request body' })
      return
    }

    const systemPrompt = buildFinanceAISystemPrompt(snapshot, { allowWrites, activeMonthIndex })
    const model = env.OPENAI_MODEL || 'gpt-4o-mini'
    const prelude = allowWrites
      ? ([
          { role: 'user', content: 'Подтверди: отвечаешь одним JSON с полями reply и actions, reply только на русском.' },
          { role: 'assistant', content: '{"reply":"Понял. Буду отвечать JSON с reply на русском и actions.","actions":[]}' },
        ] as const)
      : ([
          { role: 'user', content: 'Подтверди: будешь отвечать только на русском языке.' },
          { role: 'assistant', content: 'Да, буду отвечать только на русском языке, используя все категории и правильный текущий месяц из данных.' },
        ] as const)

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...prelude,
          ...messages,
        ],
        temperature: allowWrites ? 0.1 : 0.3,
        max_tokens: 1500,
        ...(allowWrites ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[finance-ai-dev] OpenAI error:', errText)
      json(res, 502, { error: `OpenAI API error: ${openaiRes.status}` })
      return
    }

    const openaiData = await openaiRes.json()
    const raw = openaiData.choices?.[0]?.message?.content ?? ''
    const parsed = allowWrites ? parseFinanceAIPayload(raw) : { reply: raw, actions: [] }

    json(res, 200, { message: parsed.reply, actions: parsed.actions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    json(res, message === 'Payload too large' ? 413 : 500, { error: message })
  }
}
