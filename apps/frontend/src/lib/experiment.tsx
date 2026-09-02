import type { ExperimentRun } from "@/api/training";

export function formatLoss(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 100) return trimFloat(value.toFixed(1));
  if (abs >= 10) return trimFloat(value.toFixed(2));
  if (abs >= 1) return trimFloat(value.toFixed(4));
  if (abs >= 0.001) return trimFloat(value.toFixed(6));
  return value.toExponential(2);
}

export function formatTokensPerSec(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100) return String(Math.round(value));
  return trimFloat(value.toFixed(2));
}

export function progressLabel(run: Pick<ExperimentRun, "step" | "maxSteps">) {
  if (run.step == null) return "—";
  if (run.maxSteps == null) return run.step.toLocaleString();
  return `${run.step.toLocaleString()} / ${run.maxSteps.toLocaleString()}`;
}

export function progressPercent(step: number | null | undefined, maxSteps: number | null | undefined) {
  if (step == null || maxSteps == null || maxSteps <= 0) return null;
  return Math.min(100, Math.max(0, (step / maxSteps) * 100));
}

export function ExperimentProgress({
  step,
  maxSteps,
  compact,
}: {
  step: number | null | undefined;
  maxSteps: number | null | undefined;
  compact?: boolean;
}) {
  const label = progressLabel({ step: step ?? null, maxSteps: maxSteps ?? null });
  const pct = progressPercent(step, maxSteps);
  return (
    <div className={`exp-progress ${compact ? "is-compact" : ""}`}>
      <div className="exp-progress-label">
        {step == null ? label : <><span className="exp-sr">step </span>{label}</>}
      </div>
      {pct != null ? (
        <div className="exp-progress-track" aria-hidden="true">
          <span className="exp-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function trimFloat(text: string) {
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
