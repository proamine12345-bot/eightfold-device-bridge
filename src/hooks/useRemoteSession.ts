import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { channelName, rtcConfig, type SignalMessage } from "@/lib/webrtc";
import { ensureDeviceSession, heartbeat, lookupCode } from "@/lib/device-session";
import { AymanScreenCapture, canShareScreenInBrowser, isNativeAndroid } from "@/lib/native-screen";

export type Phase =
  | "init"
  | "ready"
  | "searching"
  | "waiting-consent"
  | "connecting"
  | "connected"
  | "refused"
  | "sharing"
  | "error";

export type IncomingRequest = { from: string; label: string };

const randomId = () => Math.random().toString(36).slice(2, 10);

export function useRemoteSession() {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [message, setMessage] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingRequest | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerCode, setPeerCode] = useState<string | null>(null);

  const deviceId = useRef<string | null>(null);
  const myId = useRef<string>(randomId());
  const hostChannel = useRef<RealtimeChannel | null>(null);
  const activeChannel = useRef<RealtimeChannel | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const viewerId = useRef<string | null>(null);
  const nativeActive = useRef(false);
  const nativeListeners = useRef<{ remove: () => Promise<void> }[]>([]);

  const send = useCallback((msg: SignalMessage) => {
    activeChannel.current?.send({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const cleanupPeer = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    setRemoteStream(null);
    viewerId.current = null;
    if (nativeActive.current) AymanScreenCapture.stopCapture().catch(() => {});
    nativeActive.current = false;
    nativeListeners.current.forEach((l) => void l.remove());
    nativeListeners.current = [];
  }, []);

  const endSession = useCallback(
    (notify = true) => {
      if (notify) send({ type: "end" });
      cleanupPeer();
      if (activeChannel.current && activeChannel.current !== hostChannel.current) {
        supabase.removeChannel(activeChannel.current);
      }
      activeChannel.current = hostChannel.current;
      setPeerCode(null);
      setIncoming(null);
      setPhase("ready");
      if (deviceId.current) heartbeat(deviceId.current, "online");
    },
    [cleanupPeer, send],
  );

  const createPeer = useCallback(
    (target?: string) => {
      const peer = new RTCPeerConnection(rtcConfig);
      peer.onicecandidate = (e) => {
        if (e.candidate) send({ type: "ice", to: target, from: myId.current, candidate: e.candidate.toJSON() });
      };
      peer.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setMessage("La connexion a été perdue.");
          endSession(false);
        }
      };
      pc.current = peer;
      return peer;
    },
    [endSession, send],
  );

  /* ---------- Côté appareil partagé (hôte) ---------- */

  const handleHostSignal = useCallback(
    async (msg: SignalMessage) => {
      if (msg.type === "request") {
        if (pc.current || nativeActive.current || incoming) return;
        setIncoming({ from: msg.from, label: msg.label });
      } else if (msg.type === "answer" && nativeActive.current) {
        await AymanScreenCapture.setRemoteAnswer({ sdp: msg.sdp.sdp ?? "" });
      } else if (msg.type === "answer" && pc.current) {
        await pc.current.setRemoteDescription(msg.sdp);
      } else if (msg.type === "ice" && nativeActive.current && msg.from !== myId.current) {
        await AymanScreenCapture.addIceCandidate({
          candidate: msg.candidate.candidate ?? "",
          sdpMid: msg.candidate.sdpMid ?? null,
          sdpMLineIndex: msg.candidate.sdpMLineIndex ?? null,
        }).catch(() => {});
      } else if (msg.type === "ice" && pc.current && msg.from !== myId.current) {
        await pc.current.addIceCandidate(msg.candidate).catch(() => {});
      } else if (msg.type === "end") {
        setMessage("La session a été fermée par l'autre appareil.");
        endSession(false);
      }
    },
    [endSession, incoming],
  );

  const acceptRequest = useCallback(async () => {
    if (!incoming) return;
    const target = incoming.from;
    viewerId.current = target;
    setIncoming(null);
    setPhase("connecting");

    // L'utilisateur a réellement accepté : ne pas afficher « refusé » si une étape technique échoue.
    send({ type: "accepted", to: target });

    try {
      if (isNativeAndroid()) {
        // Android : MediaProjection + WebRTC natif. Le JS relaie uniquement la signalisation.
        nativeListeners.current.push(
          await AymanScreenCapture.addListener("iceCandidate", (c) =>
            send({ type: "ice", to: target, from: myId.current, candidate: c }),
          ),
          await AymanScreenCapture.addListener("captureStopped", () => endSession()),
        );
        const offer = await AymanScreenCapture.startCapture({
          iceServers: (rtcConfig.iceServers ?? []).flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls])),
        });
        nativeActive.current = true;
        send({ type: "offer", to: target, sdp: offer as RTCSessionDescriptionInit });
        setPhase("sharing");
        if (deviceId.current) heartbeat(deviceId.current, "busy");
        return;
      }
      if (!canShareScreenInBrowser()) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localStream.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => endSession());
      const peer = createPeer(target);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      send({ type: "offer", to: target, sdp: offer });
      setPhase("sharing");
      if (deviceId.current) heartbeat(deviceId.current, "busy");
    } catch (err) {
      const reason = (err as Error).message;
      send({ type: "failed", to: target, reason: reason === "unsupported" ? "unsupported" : "startup" });
      setMessage(
        reason === "unsupported"
          ? "Le partage d'écran n'est pas disponible dans ce navigateur. Utilisez l'application Android."
          : "Vous avez accepté, mais le partage d'écran n'a pas pu démarrer. Vérifiez l'autorisation Android puis réessayez.",
      );
      cleanupPeer();
      setPhase("ready");
    }
  }, [cleanupPeer, createPeer, endSession, incoming, send]);

  const refuseRequest = useCallback(() => {
    if (incoming) send({ type: "refused", to: incoming.from });
    setIncoming(null);
  }, [incoming, send]);

  /* ---------- Côté appareil qui regarde (viewer) ---------- */

  const connectToCode = useCallback(
    async (code: string) => {
      if (code === myCode) {
        setMessage("Ce code est celui de cet appareil.");
        return;
      }
      setPhase("searching");
      setMessage(null);
      const target = await lookupCode(code);
      if (!target) {
        setMessage("Aucun appareil ne correspond à ce code.");
        setPhase("ready");
        return;
      }
      setPeerCode(code);
      const peer = createPeer();
      peer.addTransceiver("video", { direction: "recvonly" });

      const ch = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const msg = payload as SignalMessage;
        if (msg.type === "accepted" && msg.to === myId.current) setPhase("connecting");
        if (msg.type === "refused" && msg.to === myId.current) {
          setMessage("L'autre appareil a refusé la connexion.");
          endSession(false);
          setPhase("refused");
        }
        if (msg.type === "failed" && msg.to === myId.current) {
          setMessage(
            msg.reason === "unsupported"
              ? "L'autre appareil a accepté, mais son navigateur ne permet pas le partage d'écran."
              : "L'autre appareil a accepté, mais le partage n'a pas pu démarrer. Vérifiez les autorisations et réessayez.",
          );
          endSession(false);
        }
        if (msg.type === "offer" && msg.to === myId.current && pc.current) {
          await pc.current.setRemoteDescription(msg.sdp);
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          send({ type: "answer", from: myId.current, sdp: answer });
          setPhase("connected");
        }
        if (msg.type === "ice" && msg.from !== myId.current && pc.current) {
          await pc.current.addIceCandidate(msg.candidate).catch(() => {});
        }
        if (msg.type === "end") {
          setMessage("La session a été fermée par l'autre appareil.");
          endSession(false);
        }
      });
      await ch.subscribe();
      activeChannel.current = ch;
      setPhase("waiting-consent");
      send({ type: "request", from: myId.current, label: `Code ${myCode ?? "—"}` });
    },
    [createPeer, endSession, myCode, send],
  );

  const hostHandler = useRef(handleHostSignal);
  hostHandler.current = handleHostSignal;

  /* ---------- Initialisation ---------- */

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    (async () => {
      try {
        const session = await ensureDeviceSession();
        if (!mounted) return;
        deviceId.current = session.id;
        setMyCode(session.code);

        const ch = supabase.channel(channelName(session.code), {
          config: { broadcast: { self: false } },
        });
        ch.on("broadcast", { event: "signal" }, ({ payload }) => {
          void hostHandler.current(payload as SignalMessage);
        });
        await ch.subscribe();
        hostChannel.current = ch;
        activeChannel.current = ch;
        setPhase("ready");
        timer = setInterval(() => heartbeat(session.id), 45_000);
      } catch {
        if (mounted) {
          setPhase("error");
          setMessage("Impossible de contacter le serveur. Vérifiez votre connexion Internet.");
        }
      }
    })();

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
      pc.current?.close();
      localStream.current?.getTracks().forEach((t) => t.stop());
      if (hostChannel.current) supabase.removeChannel(hostChannel.current);
      if (activeChannel.current && activeChannel.current !== hostChannel.current) {
        supabase.removeChannel(activeChannel.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    myCode,
    phase,
    message,
    incoming,
    remoteStream,
    peerCode,
    clearMessage: () => setMessage(null),
    connectToCode,
    acceptRequest,
    refuseRequest,
    endSession,
  };
}
