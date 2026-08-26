import { useEffect, useRef, useState } from "react";

/** GitHub Issue 标签默认 16 色。 */
export const COLOR_PALETTE = [
  "#b60205",
  "#d93f0b",
  "#fbca04",
  "#0e8a16",
  "#006b75",
  "#1d76db",
  "#0052cc",
  "#5319e7",
  "#e99695",
  "#f9d0c4",
  "#fef2c0",
  "#c2e0c6",
  "#bfdadc",
  "#c5def5",
  "#bfd4f2",
  "#d4c5f9",
] as const;

type Props = {
  id: string;
  value: string;
  onChange: (color: string) => void;
};

function hexLuminance(hex: string): number {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) {
    return 0;
  }
  const n = Number.parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function nextPaletteColor(current: string): string {
  const i = COLOR_PALETTE.findIndex((c) => c.toLowerCase() === current.trim().toLowerCase());
  return COLOR_PALETTE[(i + 1) % COLOR_PALETTE.length];
}

export function ColorField({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value.trim());
  const swatch = valid ? value.trim() : "#3b82f6";
  const light = hexLuminance(swatch) > 160;

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
    <div className="dc-color-field" ref={wrapRef}>
      <div className="dc-color-row">
        <button
          type="button"
          className="dc-color-swatch"
          style={{ background: swatch }}
          aria-label="换一个颜色"
          title="换一个颜色"
          onClick={() => onChange(nextPaletteColor(value))}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={light ? "#0f172a" : "#fff"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
        <input
          id={id}
          type="text"
          className="mono"
          value={value}
          placeholder="#3b82f6"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {open ? (
        <div className="dc-color-palette" role="listbox" aria-label="常用颜色" onMouseDown={(event) => event.preventDefault()}>
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
      ) : null}
    </div>
  );
}
