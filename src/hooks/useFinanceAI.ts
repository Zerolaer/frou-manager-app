import { useCallback, useRef, useState } from 'react'
import { sendFinanceAIChat } from '@/features/finance/ai/client'
import { applyFinanceAIActions, parseFinanceAIPayload } from '@/features/finance/ai/actions'
import { fetchFinanceSnapshotForAI } from '@/features/finance/snapshot'
import type { FinanceChatMessage, FinanceSnapshot } from '@/features/finance/ai/types'
import type { Cat } from '@/types/shared'

function newMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type UseFinanceAIOptions = {
  allowWrites?: boolean
  activeMonthIndex?: number
  userId?: string | null
  onDataChanged?: () => void
}

export function useFinanceAI(
  year: number,
  income: Cat[],
  expense: Cat[],
  options: UseFinanceAIOptions = {}
) {
  const [messages, setMessages] = useState<FinanceChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const snapshotRef = useRef<FinanceSnapshot | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

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
        const { allowWrites, activeMonthIndex, userId, onDataChanged } = optionsRef.current

        const response = await sendFinanceAIChat({
          messages: history,
          snapshot,
          locale: 'ru',
          allowWrites,
          activeMonthIndex,
        })

        if (response.error) {
          setError(response.error)
          return
        }

        const parsed = parseFinanceAIPayload(response.message)
        const actions = response.actions?.length ? response.actions : parsed.actions
        const looksLikeJson = /^\s*\{/.test(response.message) || response.message.includes('```json')
        let reply = looksLikeJson ? parsed.reply : response.message || parsed.reply

        if (allowWrites && actions.length && userId) {
          const result = await applyFinanceAIActions({
            userId,
            year,
            activeMonthIndex: activeMonthIndex ?? snapshot.temporal.calendar_month_index,
            snapshot,
            actions,
          })
          snapshotRef.current = null
          if (result.applied.length) onDataChanged?.()
          if (result.errors.length) {
            reply = `${reply}\n\n${result.errors.join('\n')}`
          }
        }

        const assistantMsg: FinanceChatMessage = {
          id: newMessageId(),
          role: 'assistant',
          content: reply,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [loading, messages, ensureSnapshot, year]
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
