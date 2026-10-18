import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RemoteControlAction } from "@/lib/native-screen";

type Props = {
  stream: MediaStream;
  peerCode: string | null;
  onEnd: () => void;
  onControl: (action: RemoteControlAction) => void;
};

type Point = { x: number; y: number; at: number };

export function RemoteScreen({ stream, peerCode, onEnd, onControl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startPoint = useRef<Point | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const normalizedPoint = (clientX: number, clientY: number) => {
    const video = videoRef.current;
    if (!video) return { x: 0.5, y: 0.5 };
    const rect = video.getBoundingClientRect();
    const videoWidth = video.videoWidth || rect.width;
    const videoHeight = video.videoHeight || rect.height;
    const scale = Math.min(rect.width / videoWidth, rect.height / videoHeight);
    const shownWidth = videoWidth * scale;
    const shownHeight = videoHeight * scale;
    const left = rect.left + (rect.width - shownWidth) / 2;
    const top = rect.top + (rect.height - shownHeight) / 2;
    return {
      x: Math.max(0, Math.min(1, (clientX - left) / shownWidth)),
      y: Math.max(0, Math.min(1, (clientY - top) / shownHeight)),
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLVideoElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = normalizedPoint(event.clientX, event.clientY);
    startPoint.current = { ...point, at: Date.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLVideoElement>) => {
    const start = startPoint.current;
    startPoint.current = null;
    if (!start) return;
    const end = normalizedPoint(event.clientX, event.clientY);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance < 0.018) {
      onControl({ action: "tap", x: end.x, y: end.y });
    } else {
      onControl({
        action: "swipe",
        x: start.x,
        y: start.y,
        x2: end.x,
        y2: end.y,
        durationMs: Math.max(120, Math.min(900, Date.now() - start.at)),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Session en cours</p>
          <p className="text-xs text-muted-foreground">Appareil {peerCode ?? ""}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={onEnd}>
          Terminer
        </Button>
      </header>
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border p-2">
        <Button variant="outline" size="sm" onClick={() => onControl({ action: "back" })}>Retour</Button>
        <Button variant="outline" size="sm" onClick={() => onControl({ action: "home" })}>Accueil</Button>
        <Button variant="outline" size="sm" onClick={() => onControl({ action: "recents" })}>Apps récentes</Button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="h-full w-full flex-1 touch-none bg-muted object-contain"
        aria-label="Écran distant : toucher ou glisser pour contrôler l'appareil"
      />
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          onControl({ action: "text", text });
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Envoyer du texte au champ sélectionné…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          aria-label="Texte à envoyer au téléphone distant"
        />
        <Button type="submit" size="sm" disabled={!text.trim()}>Envoyer</Button>
      </form>
    </div>
  );
}
