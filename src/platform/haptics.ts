import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNativeIOS } from '@/platform/nativeApp'

async function runHaptic(fn: () => Promise<void>) {
  if (!isNativeIOS()) return
  try {
    await fn()
  } catch {
    // Haptics unavailable in simulator or without plugin
  }
}

/** Light tap feedback for toggles and chip selection. */
export function hapticLightTap(): void {
  void runHaptic(() => Haptics.impact({ style: ImpactStyle.Light }))
}

/** Success feedback when a task is marked complete. */
export function hapticTaskComplete(): void {
  void runHaptic(() => Haptics.notification({ type: NotificationType.Success }))
}

/** Subtle feedback when a task is reopened. */
export function hapticSelection(): void {
  void runHaptic(() => Haptics.selectionChanged())
}
