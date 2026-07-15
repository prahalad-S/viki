"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface TokenExhaustedDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TokenExhaustedDialog({ open, onClose }: TokenExhaustedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-7 text-destructive" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Free Usage Exhausted</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You ran out of free usage. Add your own API keys to continue using the chatbox.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click <span className="font-semibold text-foreground">AI Provider Settings</span> in the top-right corner to add your keys.
        </p>
        <Button className="w-full mt-2" onClick={onClose}>
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
