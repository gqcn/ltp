import type { InputHTMLAttributes, ReactNode } from "react";
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
