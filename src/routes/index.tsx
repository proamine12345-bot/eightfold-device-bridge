import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CodeDisplay } from "@/components/CodeDisplay";
import { ConnectDialog } from "@/components/ConnectDialog";
import { IncomingRequestDialog } from "@/components/IncomingRequestDialog";
import { RemoteScreen } from "@/components/RemoteScreen";
import { useRemoteSession } from "@/hooks/useRemoteSession";
import { AymanScreenCapture, isNativeAndroid } from "@/lib/native-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ayman Remote — Assistance à distance" },
      { name: "description", content: "Partagez l'écran de votre appareil en toute sécurité avec un code à 8 chiffres." },
      { property: "og:title", content: "Ayman Remote — Assistance à distance" },
      { property: "og:description", content: "Sessions d'assistance chiffrées, avec l'accord des deux appareils." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const phaseLabel: Record<string, string> = {
  searching: "Recherche de l'appareil…",
  "waiting-consent": "En attente de l'accord de l'autre appareil…",
  connecting: "Établissement de la connexion chiffrée…",
};

export function Home() {
  const s = useRemoteSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (s.message) {
      toast(s.message);
      s.clearMessage();
    }
  }, [s.message, s]);

  const busy = s.phase in phaseLabel;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between px-6 py-10">
      <header className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--glow)]" />
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-foreground">
          Ayman Remote
        </span>
      </header>

      <section className="flex flex-col items-center gap-8">
        {s.phase === "init" ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <CodeDisplay code={s.myCode} />
        )}

        {s.phase === "sharing" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-center">
            <p className="text-sm font-medium text-foreground">Votre écran est partagé</p>
            {isNativeAndroid() && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void AymanScreenCapture.openAccessibilitySettings().catch(() =>
                      toast.error("Impossible d'ouvrir les paramètres d'accessibilité Android."),
                    )
                  }
                >
                  Activer le contrôle tactile
                </Button>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Activez « Ayman Remote control » dans les paramètres Android pour autoriser les gestes pendant une session acceptée.
                </p>
              </div>
            )}
            <Button variant="destructive" size="sm" onClick={() => s.endSession()}>
              Arrêter le partage
            </Button>
          </div>
        )}

        {busy && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {phaseLabel[s.phase]}
            <button aria-label="Annuler" onClick={() => s.endSession()} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <footer className="flex w-full max-w-xs flex-col items-center gap-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-2xl text-base font-semibold"
          disabled={s.phase !== "ready" && s.phase !== "refused"}
          onClick={() => setOpen(true)}
        >
          Entrer un autre code
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Connexion chiffrée de bout en bout
        </p>
      </footer>

      <ConnectDialog
        open={open}
        onOpenChange={setOpen}
        pending={busy}
        onSubmit={(code) => {
          setOpen(false);
          void s.connectToCode(code);
        }}
      />
      <IncomingRequestDialog label={s.incoming?.label ?? null} onAccept={s.acceptRequest} onRefuse={s.refuseRequest} />
      {s.remoteStream && s.phase === "connected" && (
        <RemoteScreen
          stream={s.remoteStream}
          peerCode={s.peerCode}
          onEnd={() => s.endSession()}
          onControl={s.sendControl}
        />
      )}
    </main>
  );
}
