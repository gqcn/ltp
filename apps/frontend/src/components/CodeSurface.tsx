import { useEffect, useRef, type Ref } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { properties } from "@codemirror/legacy-modes/mode/properties";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import { classHighlighter, tags as t } from "@lezer/highlight";
import { cn } from "@/lib/cn";
import { type CodeLanguage } from "@/lib/code-lang";

export type { CodeLanguage };

export type CodeSurfaceProps = {
  value: string;
  language: CodeLanguage;
  className?: string;
  id?: string;
  placeholder?: string;
  minHeight?: number;
  lineNumbers?: boolean;
  wrap?: boolean;
  tabIndent?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLElement | null>;
};

const codeHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: t.lineComment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: t.blockComment, color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: t.keyword, color: "var(--hl-cmd)" },
  { tag: t.controlKeyword, color: "var(--hl-cmd)" },
  { tag: t.definitionKeyword, color: "var(--hl-cmd)" },
  { tag: t.operatorKeyword, color: "var(--hl-flag)" },
  { tag: t.name, color: "var(--hl-key)" },
  { tag: t.propertyName, color: "var(--hl-key)" },
  { tag: t.attributeName, color: "var(--hl-key)" },
  { tag: t.labelName, color: "var(--hl-key)" },
  { tag: t.variableName, color: "var(--hl-var)" },
  { tag: t.special(t.variableName), color: "var(--hl-var)" },
  { tag: t.definition(t.variableName), color: "var(--hl-var)" },
  { tag: t.string, color: "var(--hl-str)" },
  { tag: t.literal, color: "var(--hl-str)" },
  { tag: t.regexp, color: "var(--hl-str)" },
  { tag: t.number, color: "var(--hl-num)" },
  { tag: t.bool, color: "var(--hl-bool)" },
  { tag: t.null, color: "var(--hl-bool)" },
  { tag: t.atom, color: "var(--hl-bool)" },
  { tag: t.punctuation, color: "var(--hl-punct)" },
  { tag: t.operator, color: "var(--hl-punct)" },
  { tag: t.meta, color: "var(--hl-meta)" },
  { tag: t.processingInstruction, color: "var(--hl-meta)" },
  { tag: t.typeName, color: "var(--hl-flag)" },
  { tag: t.tagName, color: "var(--hl-cmd)" },
  { tag: t.escape, color: "var(--hl-var)" },
]);

const codeBaseTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--code-bg)",
    color: "var(--hl-text)",
    fontFamily: "var(--mono)",
    fontSize: "12.5px",
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--mono)",
    lineHeight: "1.55",
  },
  ".cm-content": {
    fontFamily: "var(--mono)",
    caretColor: "var(--text-0)",
    padding: "14px 16px",
    minHeight: "100%",
  },
  ".cm-gutters": {
    backgroundColor: "var(--code-bg)",
    color: "var(--text-3)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
  },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--primary) 28%, transparent) !important",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--text-0)",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-placeholder": {
    color: "var(--text-3)",
  },
});

function languageExt(language: CodeLanguage): Extension {
  switch (language) {
    case "yaml":
      return yaml();
    case "json":
      return json();
    case "shell":
      return StreamLanguage.define(shell);
    case "env":
      return StreamLanguage.define(properties);
    default:
      return [];
  }
}

function contentAttrs(
  props: Pick<CodeSurfaceProps, "id" | "invalid" | "aria-label" | "aria-describedby">,
  mode: "editor" | "viewer",
): Record<string, string> {
  const attrs: Record<string, string> = {
    role: mode === "editor" ? "textbox" : "document",
    spellcheck: "false",
  };
  if (props.id) attrs.id = props.id;
  if (props["aria-label"]) attrs["aria-label"] = props["aria-label"];
  if (props["aria-describedby"]) attrs["aria-describedby"] = props["aria-describedby"];
  if (props.invalid) attrs["aria-invalid"] = "true";
  if (mode === "editor") attrs["aria-multiline"] = "true";
  return attrs;
}

function assignRef(ref: Ref<HTMLElement | null> | undefined, value: HTMLElement | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function CodeSurface({
  mode,
  value,
  language,
  className,
  id,
  placeholder,
  minHeight,
  lineNumbers: showLineNumbers = false,
  wrap = false,
  tabIndent = false,
  invalid,
  onChange,
  onBlur,
  inputRef,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: CodeSurfaceProps & { mode: "editor" | "viewer" }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const inputRefRef = useRef(inputRef);
  const compartments = useRef({
    lang: new Compartment(),
    wrap: new Compartment(),
    gutters: new Compartment(),
    editable: new Compartment(),
    attrs: new Compartment(),
    placeholder: new Compartment(),
    tab: new Compartment(),
  });
  const a11y = { id, invalid, "aria-label": ariaLabel, "aria-describedby": ariaDescribedBy };

  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;
  inputRefRef.current = inputRef;

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const c = compartments.current;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: value,
        extensions: [
          highlightSpecialChars(),
          drawSelection(),
          syntaxHighlighting(codeHighlightStyle),
          syntaxHighlighting(classHighlighter),
          codeBaseTheme,
          EditorState.tabSize.of(2),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          mode === "editor" ? history() : [],
          c.lang.of(languageExt(language)),
          c.wrap.of(wrap ? EditorView.lineWrapping : []),
          c.gutters.of(showLineNumbers ? lineNumbers() : []),
          c.editable.of([
            EditorState.readOnly.of(mode === "viewer"),
            EditorView.editable.of(mode === "editor"),
            mode === "editor" ? highlightActiveLine() : [],
          ]),
          c.attrs.of(EditorView.contentAttributes.of(contentAttrs(a11y, mode))),
          c.placeholder.of(placeholder ? cmPlaceholder(placeholder) : []),
          c.tab.of(tabIndent ? keymap.of([indentWithTab]) : []),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            blur() {
              onBlurRef.current?.();
            },
          }),
        ],
      }),
    });
    viewRef.current = view;
    assignRef(inputRefRef.current, view.contentDOM);
    const ro = new ResizeObserver(() => view.requestMeasure());
    ro.observe(parent);
    return () => {
      ro.disconnect();
      assignRef(inputRefRef.current, null);
      view.destroy();
      viewRef.current = undefined;
    };
  }, [mode]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const c = compartments.current;
    view.dispatch({
      effects: [
        c.lang.reconfigure(languageExt(language)),
        c.wrap.reconfigure(wrap ? EditorView.lineWrapping : []),
        c.gutters.reconfigure(showLineNumbers ? lineNumbers() : []),
        c.editable.reconfigure([
          EditorState.readOnly.of(mode === "viewer"),
          EditorView.editable.of(mode === "editor"),
          mode === "editor" ? highlightActiveLine() : [],
        ]),
        c.attrs.reconfigure(EditorView.contentAttributes.of(contentAttrs(a11y, mode))),
        c.placeholder.reconfigure(placeholder ? cmPlaceholder(placeholder) : []),
        c.tab.reconfigure(tabIndent ? keymap.of([indentWithTab]) : []),
      ],
    });
  }, [mode, language, wrap, showLineNumbers, tabIndent, id, invalid, placeholder, ariaLabel, ariaDescribedBy]);

  return (
    <div
      ref={parentRef}
      className={cn("code-surface code-block is-hl", mode === "editor" ? "code-surface--editor" : "code-surface--viewer", className)}
      data-code-surface={mode}
      data-lang={language}
      style={minHeight ? { minHeight } : undefined}
    />
  );
}

export function CodeEditorImpl(props: CodeSurfaceProps) {
  return (
    <CodeSurface
      {...props}
      mode="editor"
      wrap={props.wrap ?? true}
      lineNumbers={props.lineNumbers ?? false}
      tabIndent={props.tabIndent ?? false}
    />
  );
}

export function CodeViewerImpl(props: CodeSurfaceProps) {
  return (
    <CodeSurface
      {...props}
      mode="viewer"
      wrap={props.wrap ?? false}
      lineNumbers={props.lineNumbers ?? true}
      tabIndent={false}
      onChange={undefined}
      placeholder={undefined}
    />
  );
}
