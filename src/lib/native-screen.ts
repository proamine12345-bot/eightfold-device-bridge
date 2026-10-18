import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * Pont vers le plugin Android natif « AymanScreenCapture » (sources dans android-native/).
 * Le natif capture l'écran (MediaProjection) et gère la connexion WebRTC ;
 * le JavaScript relaie uniquement la signalisation (offre / réponse / ICE).
 * Dans un navigateur, ce plugin n'existe pas et l'app utilise getDisplayMedia.
 */
export interface AymanScreenCapturePlugin {
  /** Affiche la boîte de dialogue système MediaProjection, démarre le service et renvoie l'offre SDP. */
  startCapture(options: { iceServers: string[] }): Promise<{ type: "offer"; sdp: string }>;
  setRemoteAnswer(options: { sdp: string }): Promise<void>;
  addIceCandidate(options: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }): Promise<void>;
  stopCapture(): Promise<void>;
  addListener(
    event: "iceCandidate",
    cb: (c: { candidate: string; sdpMid: string; sdpMLineIndex: number }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(event: "captureStopped", cb: () => void): Promise<PluginListenerHandle>;
}

export const AymanScreenCapture = registerPlugin<AymanScreenCapturePlugin>("AymanScreenCapture");

export const isNativeAndroid = () => Capacitor.getPlatform() === "android";

export function canShareScreenInBrowser(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
}
