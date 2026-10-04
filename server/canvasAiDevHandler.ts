import type { IncomingMessage, ServerResponse } from 'http'
import { createClient } from '@supabase/supabase-js'
import { consumeAiRateLimit, sanitizeFinanceChatMessages } from '../src/features/finance/ai/sanitizeChat'
import { parseCanvasAiLayoutFromModelText } from '../src/features/canvas/ai/schema'
import { buildCanvasAiSystemPrompt } from '../src/features/canvas/ai/systemPrompt'

const MAX_BODY_BYTES = 80_000

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
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
      if (!data.trim()) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(data) as Record<string, unknown>)
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

async function handleCanvasAiLayoutInner(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
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

  if (!consumeAiRateLimit(`canvas:${authData.user.id}`)) {
    json(res, 429, { error: 'Too many AI requests' })
    return
  }

  const openaiKey = env.OPENAI_API_KEY
  if (!openaiKey) {
    json(res, 503, { error: 'OPENAI_API_KEY is not set in .env.local' })
    return
  }

  const body = await readJsonBody(req)
  const messages = sanitizeFinanceChatMessages(body.messages)
  if (!messages.length) {
    json(res, 400, { error: 'Invalid request body' })
    return
  }

  const model = env.OPENAI_MODEL || 'gpt-4o-mini'
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: buildCanvasAiSystemPrompt() }, ...messages],
      temperature: 0.4,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!openaiRes.ok) {
    const errText = await openaiRes.text()
    console.error('[canvas-ai-dev] OpenAI error:', errText)
    json(res, 502, { error: `OpenAI API error: ${openaiRes.status}` })
    return
  }

  const openaiRaw = await openaiRes.text()
  if (!openaiRaw.trim()) {
    json(res, 502, { error: 'Empty response from OpenAI' })
    return
  }
  let openaiData: { choices?: { finish_reason?: string; message?: { content?: string } }[] }
  try {
    openaiData = JSON.parse(openaiRaw) as typeof openaiData
  } catch {
    json(res, 502, { error: 'OpenAI returned non-JSON' })
    return
  }
  const raw = openaiData.choices?.[0]?.message?.content ?? ''
  if (!raw.trim()) {
    json(res, 502, { error: 'OpenAI returned empty content' })
    return
  }
  const layout = parseCanvasAiLayoutFromModelText(raw)
  if (!layout) {
    json(res, 502, { error: 'Could not parse canvas layout' })
    return
  }

  json(res, 200, layout)
}

export async function handleCanvasAiLayout(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
) {
  try {
    await handleCanvasAiLayoutInner(req, res, env)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    if (!res.headersSent) {
      json(res, message === 'Payload too large' ? 413 : 500, { error: message })
    }
  }
}
