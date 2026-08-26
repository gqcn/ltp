import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmText?: string;
  confirmVariant?: "primary" | "danger";
  maxWidth?: number;
  modalClassName?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
};

export function Modal({
  open,
  title,
  children,
  confirmText,
  confirmVariant = "primary",
  maxWidth,
  modalClassName,
  onClose,
  onConfirm,
  confirmDisabled,
}: Props) {
  return (
    <div className={open ? "modal-overlay show" : "modal-overlay"} onClick={onClose}>
      <div
        className={cn("modal", modalClassName)}
        role="dialog"
        aria-modal="true"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm" aria-label="关闭" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm ? (
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>
              {confirmText ?? "确认"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
