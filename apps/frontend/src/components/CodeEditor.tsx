import { lazy, Suspense } from "react";
import { cn } from "@/lib/cn";
import type { CodeSurfaceProps } from "./CodeSurface";

export type { CodeLanguage } from "@/lib/code-lang";
export { codeLangFromPath } from "@/lib/code-lang";
export type { CodeSurfaceProps };

const EditorImpl = lazy(() => import("./CodeSurface").then((m) => ({ default: m.CodeEditorImpl })));
const ViewerImpl = lazy(() => import("./CodeSurface").then((m) => ({ default: m.CodeViewerImpl })));

function Fallback({
  surface,
  language,
  className,
  minHeight,
  value,
}: Pick<CodeSurfaceProps, "language" | "className" | "minHeight" | "value"> & { surface: "editor" | "viewer" }) {
  return (
    <div
      className={cn("code-surface code-block is-hl", className)}
      data-code-surface={surface}
      data-lang={language}
      style={minHeight ? { minHeight } : undefined}
    >
      <pre className="code-surface-fallback">{value}</pre>
    </div>
  );
}

export function CodeEditor(props: CodeSurfaceProps) {
  return (
    <Suspense fallback={<Fallback surface="editor" {...props} />}>
      <EditorImpl {...props} />
    </Suspense>
  );
}

export function CodeViewer(props: CodeSurfaceProps) {
  return (
    <Suspense fallback={<Fallback surface="viewer" {...props} />}>
      <ViewerImpl {...props} />
    </Suspense>
  );
}
