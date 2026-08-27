import { useEffect, useRef, useState } from "react";

/** 与原型一致：平台常用色 + GitHub 标签色。 */
export const COLOR_PALETTE = [
  "#3b82f6",
  "#22d3ee",
  "#a78bfa",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#f472b6",
  "#1d76db",
  "#0052cc",
  "#5319e7",
  "#0e8a16",
  "#006b75",
  "#d93f0b",
  "#fbca04",
  "#b60205",
] as const;

type Props = {
  id: string;
  value: string;
  onChange: (color: string) => void;
};

function hexContrastColor(hex: string): string {
  const n = Number.parseInt(hex.trim().slice(1), 16);
  if (Number.isNaN(n)) {
    return "#ffffff";
  }
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 >= 148 ? "#111827" : "#ffffff";
}

export function nextPaletteColor(current: string): string {
  const i = COLOR_PALETTE.findIndex((c) => c.toLowerCase() === current.trim().toLowerCase());
  return COLOR_PALETTE[(i + 1) % COLOR_PALETTE.length];
}

export function ColorField({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value.trim());
  const swatch = valid ? value.trim() : "#3b82f6";

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={open ? "dc-color-row is-open" : "dc-color-row"} id="dc-color-picker">
      <button
        type="button"
        className={spinning ? "dc-color-swatch is-spinning" : "dc-color-swatch"}
        style={{ background: swatch, color: hexContrastColor(swatch) }}
        aria-label="换一个颜色"
        title="换一个颜色"
        onClick={() => {
          onChange(nextPaletteColor(value));
          setOpen(false);
          setSpinning(false);
          window.requestAnimationFrame(() => setSpinning(true));
        }}
        onAnimationEnd={() => setSpinning(false)}
      >
        <svg className="dc-color-swatch-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"
          />
        </svg>
      </button>
      <div className="dc-color-input-wrap">
        <input
          id={id}
          type="text"
          className="mono"
          value={value}
          placeholder="#3b82f6"
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          title="点击选择常用颜色，或输入色值"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="dc-form-color-palette"
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {open ? (
        <div className="dc-color-palette" id="dc-form-color-palette">
          <div className="dc-color-palette-title">常用颜色</div>
          <div
            className="dc-color-palette-grid"
            id="dc-form-color-grid"
            role="listbox"
            aria-label="常用颜色"
            onMouseDown={(event) => event.preventDefault()}
          >
            {COLOR_PALETTE.map((color) => {
              const selected = color.toLowerCase() === swatch.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={color}
                  title={color}
                  className={selected ? "dc-color-chip is-selected" : "dc-color-chip"}
                  style={{ background: color }}
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
          <div className="dc-color-palette-hint">也可直接输入 6 位色值，如 #3b82f6</div>
        </div>
      ) : null}
    </div>
  );
}
