import type { InputHTMLAttributes, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: ReactNode;
  hint?: string;
  locked?: boolean;
  lockText?: string;
  requiredMark?: boolean;
  error?: string;
  groupClassName?: string;
};

function placeFloatingTip(anchor: HTMLElement, tip: HTMLElement) {
  const gap = 8;
  const margin = 12;
  const r = anchor.getBoundingClientRect();
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  const below = r.top < h + gap + margin;
  let top = below ? r.bottom + gap : r.top - h - gap;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - w - margin));
  top = Math.min(Math.max(top, margin), Math.max(margin, window.innerHeight - h - margin));
  return { top, left, below };
}

export function FieldHelp({ tip, label }: { tip: string; label: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);

  function syncOpen() {
    setOpen(hoverRef.current || focusRef.current);
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const btn = btnRef.current;
      const tipEl = tipRef.current;
      if (!btn || !tipEl) {
        return;
      }
      setPos(placeFloatingTip(btn, tipEl));
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, tip]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={cn("field-help", open && "is-open")}
        aria-label={label}
        onMouseEnter={() => {
          hoverRef.current = true;
          syncOpen();
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          syncOpen();
        }}
        onFocus={() => {
          focusRef.current = true;
          syncOpen();
        }}
        onBlur={() => {
          focusRef.current = false;
          syncOpen();
        }}
      >
        ?
      </button>
      {open
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              className={cn("field-help-floating-tip", pos && "is-visible", pos?.below && "is-below")}
              style={pos ? { top: pos.top, left: pos.left } : undefined}
            >
              {tip}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) {
    return null;
  }
  return (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  );
}

export function Field({ id, label, hint, locked, lockText = "不可修改", requiredMark, error, groupClassName, className, ...props }: Props) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("form-group", error && "is-invalid", groupClassName)}>
      <div className="field-label-row">
        <label htmlFor={id}>
          {label}
          {requiredMark ? (
            <>
              {" "}
              <span className="req">*</span>
            </>
          ) : null}
        </label>
        {locked ? <span className="field-lock-hint">{lockText}</span> : null}
      </div>
      <input
        id={id}
        className={cn(className)}
        readOnly={locked || props.readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <FieldError id={errorId}>{error}</FieldError>
      {hint ? (
        <p id={hintId} className="hint mono">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
