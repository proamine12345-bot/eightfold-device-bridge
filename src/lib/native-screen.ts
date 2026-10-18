import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Pont vers le plugin Android natif « AymanScreenCapture » (voir android-native/).
 * Dans le navigateur, ce plugin n'existe pas : on utilise getDisplayMedia.
 */
export interface AymanScreenCapturePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  /** Demande la permission MediaProjection officielle et démarre le service au premier plan. */
  startCapture(options: { signalingChannel: string; viewerId: string }): Promise<void>;
  stopCapture(): Promise<void>;
}

export const AymanScreenCapture = registerPlugin<AymanScreenCapturePlugin>("AymanScreenCapture");

export const isNativeAndroid = () => Capacitor.getPlatform() === "android";

export function canShareScreenInBrowser(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
}
