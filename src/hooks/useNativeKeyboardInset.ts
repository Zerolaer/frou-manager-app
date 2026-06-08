import { useEffect, useState } from 'react'
import { isNativeApp } from '@/platform/nativeApp'

/** Bottom inset (px) when the native keyboard is visible — for full-screen modals. */
export function useNativeKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!enabled || !isNativeApp()) return

    let removeListeners: (() => void) | undefined

    void import('@capacitor/keyboard').then(({ Keyboard }) => {
      const listeners: Array<Promise<{ remove: () => void }>> = [
        Keyboard.addListener('keyboardWillShow', (info) => {
          setInset(info.keyboardHeight)
          document.body.classList.add('keyboard-open')
        }),
        Keyboard.addListener('keyboardWillHide', () => {
          setInset(0)
          document.body.classList.remove('keyboard-open')
        }),
      ]

      void Promise.all(listeners).then((handles) => {
        removeListeners = () => {
          handles.forEach((handle) => handle.remove())
          document.body.classList.remove('keyboard-open')
        }
      })
    })

    return () => {
      removeListeners?.()
      setInset(0)
      document.body.classList.remove('keyboard-open')
    }
  }, [enabled])

  return inset
}
