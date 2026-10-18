import { supabase } from "@/integrations/supabase/client";
import { generateSessionCode } from "./session-code";

const STORAGE_KEY = "ayman-remote:device";

export type DeviceSession = { id: string; code: string };

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return "Appareil";
}

/**
 * Récupère le code propre à cet appareil, ou en enregistre un nouveau.
 * L'unicité est garantie par la contrainte UNIQUE en base : en cas de collision, on régénère.
 */
export async function ensureDeviceSession(): Promise<DeviceSession> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as DeviceSession;
      const { data } = await supabase
        .from("remote_sessions")
        .select("id, code")
        .eq("id", parsed.id)
        .maybeSingle();
      if (data) {
        await supabase
          .from("remote_sessions")
          .update({ status: "online", last_seen_at: new Date().toISOString() })
          .eq("id", data.id);
        return data;
      }
    } catch {
      /* on recrée ci-dessous */
    }
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateSessionCode();
    const { data, error } = await supabase
      .from("remote_sessions")
      .insert({ code, device_label: deviceLabel() })
      .select("id, code")
      .single();
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    if (error && error.code !== "23505") throw error; // 23505 = code déjà pris
  }
  throw new Error("Impossible d'attribuer un code unique.");
}

export async function heartbeat(id: string, status: "online" | "busy" = "online") {
  await supabase
    .from("remote_sessions")
    .update({ status, last_seen_at: new Date().toISOString() })
    .eq("id", id);
}

export async function lookupCode(code: string) {
  const { data } = await supabase
    .from("remote_sessions")
    .select("code, device_label, status, last_seen_at")
    .eq("code", code)
    .maybeSingle();
  return data;
}
