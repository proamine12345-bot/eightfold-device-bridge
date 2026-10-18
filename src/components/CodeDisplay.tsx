import { formatSessionCode } from "@/lib/session-code";

export function CodeDisplay({ code }: { code: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Votre code</span>
      <div className="rounded-3xl border border-border bg-card/70 px-6 py-6 shadow-[0_0_60px_-20px_var(--glow)] backdrop-blur">
        <p className="font-mono text-4xl font-semibold tabular-nums tracking-[0.18em] text-foreground sm:text-5xl">
          {code ? formatSessionCode(code) : "•••• ••••"}
        </p>
      </div>
    </div>
  );
}
