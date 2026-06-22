import { useCallback, useRef, useState } from 'react'
import { sendFinanceAIChat } from '@/features/finance/ai/client'
import { fetchFinanceSnapshotForAI } from '@/features/finance/snapshot'
import type { FinanceChatMessage, FinanceSnapshot } from '@/features/finance/ai/types'
import type { Cat } from '@/types/shared'

function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useFinanceAI(year: number, income: Cat[], expense: Cat[]) {
  const [messages, setMessages] = useState<FinanceChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const snapshotRef = useRef<FinanceSnapshot | null>(null)

  const ensureSnapshot = useCallback(async (): Promise<FinanceSnapshot> => {
    const snapshot = await fetchFinanceSnapshotForAI(year, {
      includeCells: true,
      income,
      expense,
    })
    snapshotRef.current = snapshot
    return snapshot
  }, [year, income, expense])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMsg: FinanceChatMessage = {
        id: newMessageId(),
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg])
      setLoading(true)
      setError(null)

      try {
        const snapshot = await ensureSnapshot()
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const response = await sendFinanceAIChat({
          messages: history,
          snapshot,
          locale: 'ru',
        })

        if (response.error) {
          setError(response.error)
          return
        }

        const assistantMsg: FinanceChatMessage = {
          id: newMessageId(),
          role: 'assistant',
          content: response.message,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [loading, messages, ensureSnapshot]
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    snapshotRef.current = null
  }, [])

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
    ensureSnapshot,
  }
}
