import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  maxWidth?: number;
  modalClassName?: string;
  footerLeft?: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmHidden?: boolean;
};

export function Modal({
  open,
  title,
  children,
  confirmText,
  cancelText = "取消",
  confirmVariant = "primary",
  maxWidth,
  modalClassName,
  footerLeft,
  onClose,
  onConfirm,
  confirmDisabled,
  confirmHidden,
}: Props) {
  const showFooter = Boolean(onConfirm) || confirmHidden || Boolean(footerLeft);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay show">
          <Dialog.Content
            className={cn("modal", modalClassName)}
            style={maxWidth ? { maxWidth } : undefined}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              const content = event.currentTarget;
              if (!(content instanceof HTMLElement)) {
                return;
              }
              const field = content.querySelector<HTMLElement>(
                ".modal-body input:not([readonly]):not([disabled]):not([type='hidden']), .modal-body textarea:not([disabled]), .modal-body select:not([disabled])",
              );
              if (field) {
                event.preventDefault();
                field.focus();
                return;
              }
              const confirm = content.querySelector<HTMLElement>(".modal-footer .btn-primary, .modal-footer .btn-danger");
              if (confirm) {
                event.preventDefault();
                confirm.focus();
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <Dialog.Title asChild>
                <h3>{title}</h3>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost btn-sm" aria-label="关闭">
                  ✕
                </button>
              </Dialog.Close>
            </div>
            <div className="modal-body">{children}</div>
            {showFooter ? (
              <div className="modal-footer" style={footerLeft ? { justifyContent: "space-between", flexWrap: "wrap", gap: 8 } : undefined}>
                {footerLeft ? <div className="modal-footer-left">{footerLeft}</div> : null}
                <div className="modal-footer-right flex gap-8">
                  <Dialog.Close asChild>
                    <Button variant="secondary">{cancelText}</Button>
                  </Dialog.Close>
                  {onConfirm && !confirmHidden ? (
                    <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>
                      {confirmText ?? "确认"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
