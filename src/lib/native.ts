import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const isIOS = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

/**
 * Trigger a native iOS haptic. No-op on web/Android-fallback.
 * style: "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection"
 */
export async function haptic(
  style:
    | "light"
    | "medium"
    | "heavy"
    | "success"
    | "warning"
    | "error"
    | "selection" = "light",
): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import(
      "@capacitor/haptics"
    );
    switch (style) {
      case "light":
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case "medium":
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case "heavy":
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case "selection":
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
        break;
      case "success":
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case "warning":
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case "error":
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch {
    // ignore, plugin missing in web build
  }
}

/** Initialize native iOS chrome: status bar + hide splash. Safe no-op on web. */
export async function initNativeChrome(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    // Don't overlay, let content sit below the status bar; safe areas handle padding.
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  } catch {
    // ignore
  }
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  } catch {
    // ignore
  }
}
