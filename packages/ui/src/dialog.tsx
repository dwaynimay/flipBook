import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export interface DialogProps {
  readonly children: ReactNode;
  readonly description: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

export function Dialog({ children, description, onOpenChange, open, title }: DialogProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="booklet-dialog-overlay" />
        <DialogPrimitive.Content className="booklet-dialog-content">
          <div className="booklet-dialog-heading">
            <div>
              <DialogPrimitive.Title className="booklet-dialog-title">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="booklet-dialog-description">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button aria-label="Tutup dialog" className="booklet-dialog-close" type="button">
                <X aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
