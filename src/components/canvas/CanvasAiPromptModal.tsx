import { useEffect, useState } from 'react'
import { UnifiedModal, useModalActions } from '@/components/ui/ModalSystem'
import { CoreTextarea } from '@/components/ui/CoreInput'
import { useSafeTranslation } from '@/utils/safeTranslation'

type Props = {
  open: boolean
  loading: boolean
  error: string | null
  onClose: () => void
  onGenerate: (prompt: string) => void
}

export function CanvasAiPromptModal({ open, loading, error, onClose, onGenerate }: Props) {
  const { t } = useSafeTranslation()
  const { createSimpleFooter } = useModalActions()
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (open) {
      setPrompt('')
    }
  }, [open])

  const trimmed = prompt.trim()

  return (
    <UnifiedModal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={t('canvas.ai.title')}
      subtitle={t('canvas.ai.subtitle')}
      size="md"
      closeOnOverlay={!loading}
      footer={createSimpleFooter(
        {
          label: loading ? t('canvas.ai.generating') : t('canvas.ai.generate'),
          onClick: () => {
            if (!trimmed || loading) return
            onGenerate(trimmed)
          },
          loading,
          disabled: !trimmed || loading,
        },
        loading ? undefined : { label: t('common.cancel') || 'Cancel', onClick: onClose }
      )}
    >
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="canvas-ai-prompt">
          {t('canvas.ai.promptLabel')}
        </label>
        <CoreTextarea
          id="canvas-ai-prompt"
          rows={5}
          value={prompt}
          disabled={loading}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('canvas.ai.placeholder')}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && trimmed && !loading) {
              e.preventDefault()
              onGenerate(trimmed)
            }
          }}
        />
        <p className="text-xs text-gray-500">{t('canvas.ai.hint')}</p>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </UnifiedModal>
  )
}
