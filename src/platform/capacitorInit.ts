import { isNativeApp, isNativeIOS } from '@/platform/nativeApp'

/** Early native shell setup — call once from main.tsx before React render. */
export async function initCapacitorNative(): Promise<void> {
  if (!isNativeApp()) return

  document.documentElement.classList.add('native-app')
  document.body.classList.add('native-app', 'capacitor-app')

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
    await Keyboard.setScroll({ isDisabled: false })
  } catch {
    // Keyboard plugin unavailable in web dev.
  }

  await syncNativeStatusBar(false)
}

/** Sync iOS status bar icons/background with app theme. */
export async function syncNativeStatusBar(isDark: boolean): Promise<void> {
  if (!isNativeIOS()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark })
    await StatusBar.setBackgroundColor({
      color: isDark ? '#111827' : '#ffffff',
    })
  } catch {
    // StatusBar styling is native-only.
  }
}

/** Hide Capacitor splash after the web app has painted. */
export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    // Splash screen plugin optional during web dev.
  }
}
