import type { IncomingMessage, ServerResponse } from 'http'
import { parseFinanceAIPayload } from '../src/features/finance/ai/actions'
import { buildFinanceAISystemPrompt } from '../src/features/finance/ai/context'
import type { FinanceSnapshot } from '../src/features/finance/ai/types'

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
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
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'content-type')
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const openaiKey = env.OPENAI_API_KEY
  if (!openaiKey) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'OPENAI_API_KEY is not set in .env.local' }))
    return
  }

  try {
    const body = await readJsonBody(req)
    const messages = body.messages as Array<{ role: 'user' | 'assistant'; content: string }> | undefined
    const snapshot = body.snapshot as FinanceSnapshot | undefined
    const allowWrites = body.allowWrites === true
    const activeMonthIndex = typeof body.activeMonthIndex === 'number' ? body.activeMonthIndex : undefined

    if (!messages?.length || !snapshot) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid request body' }))
      return
    }

    const systemPrompt =
      (typeof body.systemPrompt === 'string' && body.systemPrompt.trim()) ||
      buildFinanceAISystemPrompt(snapshot, { allowWrites, activeMonthIndex })

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
        max_tokens: 3000,
        ...(allowWrites ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[finance-ai-dev] OpenAI error:', errText)
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `OpenAI API error: ${openaiRes.status}` }))
      return
    }

    const openaiData = await openaiRes.json()
    const raw = openaiData.choices?.[0]?.message?.content ?? ''
    const parsed = allowWrites ? parseFinanceAIPayload(raw) : { reply: raw, actions: [] }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ message: parsed.reply, actions: parsed.actions }))
  } catch (err) {
    console.error('[finance-ai-dev] error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }))
  }
}
