import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  label: string | null;
  onAccept: () => void;
  onRefuse: () => void;
};

export function IncomingRequestDialog({ label, onAccept, onRefuse }: Props) {
  return (
    <Dialog open={!!label} onOpenChange={(o) => !o && onRefuse()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Demande de connexion</DialogTitle>
          <DialogDescription>
            {label} souhaite voir l'écran de cet appareil. Le partage ne démarre qu'après votre accord et peut
            être arrêté à tout moment.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onRefuse}>
            Refuser
          </Button>
          <Button className="flex-1" onClick={onAccept}>
            Accepter et partager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
