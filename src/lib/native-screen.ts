import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type RemoteControlAction =
  | { action: "tap"; x: number; y: number }
  | { action: "swipe"; x: number; y: number; x2: number; y2: number; durationMs?: number }
  | { action: "back" | "home" | "recents" }
  | { action: "text"; text: string };

export interface AymanScreenCapturePlugin {
  startCapture(options: { iceServers: { urls: string | string[]; username?: string; credential?: string }[] }): Promise<{ type: "offer"; sdp: string }>;
  setRemoteAnswer(options: { sdp: string }): Promise<void>;
  addIceCandidate(options: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }): Promise<void>;
  stopCapture(): Promise<void>;
  openAccessibilitySettings(): Promise<void>;
  performRemoteAction(options: {
    action: string;
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    durationMs?: number;
    text?: string;
  }): Promise<void>;
  isRemoteControlEnabled(): Promise<{ enabled: boolean }>;
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
