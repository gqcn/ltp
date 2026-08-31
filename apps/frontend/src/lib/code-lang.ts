export type CodeLanguage = "yaml" | "json" | "shell" | "env" | "text";

export function codeLangFromPath(path: string): CodeLanguage {
  if (/\.json$/i.test(path)) return "json";
  if (/\.ya?ml$/i.test(path)) return "yaml";
  if (/\.(sh|bash)$/i.test(path)) return "shell";
  return "text";
}
