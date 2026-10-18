import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isValidSessionCode, normalizeCodeInput } from "@/lib/session-code";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (code: string) => void;
  pending?: boolean;
};

export function ConnectDialog({ open, onOpenChange, onSubmit, pending }: Props) {
  const [code, setCode] = useState("");
  const valid = isValidSessionCode(code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrer un autre code</DialogTitle>
          <DialogDescription>
            Saisissez le code à 8 chiffres affiché sur l'autre appareil. Son propriétaire devra accepter la
            demande.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          inputMode="numeric"
          placeholder="00000000"
          value={code}
          onChange={(e) => setCode(normalizeCodeInput(e.target.value))}
          className="text-center font-mono text-2xl tracking-[0.3em]"
        />
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!valid || pending}
            onClick={() => onSubmit(code)}
          >
            {pending ? "Connexion…" : "Demander la connexion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
