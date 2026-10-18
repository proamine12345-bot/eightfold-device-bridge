import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = { stream: MediaStream; peerCode: string | null; onEnd: () => void };

export function RemoteScreen({ stream, peerCode, onEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

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
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full flex-1 bg-muted object-contain" />
    </div>
  );
}
