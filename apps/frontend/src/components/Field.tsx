import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  locked?: boolean;
  lockText?: string;
};

export function Field({ id, label, hint, locked, lockText = "不可修改", className, ...props }: Props) {
  return (
    <div className="form-group">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {locked ? <span className="field-lock-hint">{lockText}</span> : null}
      </div>
      <input id={id} className={cn(className)} readOnly={locked || props.readOnly} {...props} />
      {hint ? <p className="hint mono">{hint}</p> : null}
    </div>
  );
}
