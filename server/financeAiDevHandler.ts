import type { IncomingMessage, ServerResponse } from 'http'
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
    const locale = (body.locale as string | undefined) ?? 'ru'

    if (!messages?.length || !snapshot) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid request body' }))
      return
    }

    const model = env.OPENAI_MODEL || 'gpt-4o-mini'
    const systemPrompt = buildFinanceAISystemPrompt(snapshot)

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
          { role: 'user', content: 'Подтверди: будешь отвечать только на русском языке.' },
          { role: 'assistant', content: 'Да, буду отвечать только на русском языке, используя все категории и правильный текущий месяц из данных.' },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 3000,
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
    const message = openaiData.choices?.[0]?.message?.content ?? ''

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ message }))
  } catch (err) {
    console.error('[finance-ai-dev] error:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }))
  }
}
