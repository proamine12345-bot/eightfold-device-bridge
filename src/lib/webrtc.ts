/** Configuration WebRTC. Les serveurs STUN publics suffisent pour la plupart des réseaux ;
 *  un serveur TURN (à renseigner par l'exploitant) est nécessaire derrière certains NAT mobiles. */
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ...(import.meta.env["VITE_TURN_URL"]
      ? [
          {
            urls: import.meta.env["VITE_TURN_URL"] as string,
            username: import.meta.env["VITE_TURN_USERNAME"] as string,
            credential: import.meta.env["VITE_TURN_CREDENTIAL"] as string,
          },
        ]
      : []),
  ],
};

export type SignalMessage =
  | { type: "request"; from: string; label: string }
  | { type: "accepted"; to: string }
  | { type: "refused"; to: string }
  | { type: "failed"; to: string; reason?: string }
  | { type: "offer"; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; to?: string | undefined; from?: string | undefined; candidate: RTCIceCandidateInit }
  | { type: "end"; reason?: string };

export const channelName = (code: string) => `ayman-remote-${code}`;
