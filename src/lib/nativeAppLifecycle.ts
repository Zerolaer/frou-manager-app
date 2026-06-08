import { App as CapApp } from '@capacitor/app'
import { isNativeApp } from '@/platform/nativeApp'
import { completeAuthFromDeepLink } from '@/lib/authFlow'

/** Apply Supabase tokens from frovo://login / frovo://reset-password and route in-app. */
async function handleNativeDeepLink(url: string) {
  try {
    const { navigateTo, error } = await completeAuthFromDeepLink(url)
    if (error && import.meta.env.DEV) {
      console.error('[native] auth deep link failed:', error.message)
    }
    window.location.assign(navigateTo)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[native] malformed deep link:', err)
    }
  }
}

export async function setupNativeApp(): Promise<void> {
  if (!isNativeApp()) return

  await CapApp.addListener('appUrlOpen', ({ url }) => {
    if (import.meta.env.DEV) {
      console.log('[native] appUrlOpen', url)
    }
    void handleNativeDeepLink(url)
  })

  const launch = await CapApp.getLaunchUrl()
  if (launch?.url) {
    if (import.meta.env.DEV) {
      console.log('[native] getLaunchUrl', launch.url)
    }
    void handleNativeDeepLink(launch.url)
  }
}
