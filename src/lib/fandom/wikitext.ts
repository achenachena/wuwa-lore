export function cleanWikiText(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/{{\s*w\|([^}|]+)(?:\|[^}]*)?}}/gi, "$1")
    .replace(/{{[^{}]*}}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/\[[^\s\]]+\s([^\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTemplateField(
  wikitext: string,
  key: string,
  options: { stopAtPipe?: boolean } = {},
): string | undefined {
  const valuePattern = options.stopAtPipe ? "([^\\n|]+)" : "([^\\n]+)";
  const match = wikitext.match(
    new RegExp(`\\|\\s*${key}\\s*=\\s*${valuePattern}`),
  );
  return match ? cleanWikiText(match[1] ?? "") : undefined;
}
