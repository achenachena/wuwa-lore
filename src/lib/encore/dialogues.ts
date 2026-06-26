const SKIPPED_SPEAKERS = new Set(["{PlayerName}", "漂泊者", "Rover"]);

export function cleanPlotLine(text: string): string {
  return text
    .replace(/\{PlayerName\}/g, "")
    .replace(/\*[^*]+\*/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractDialogueLinesBySpeaker(payload: unknown): Map<string, string[]> {
  const lines = new Map<string, string[]>();

  const append = (speaker: string, rawText: string) => {
    const normalizedSpeaker = speaker.trim();
    if (!normalizedSpeaker || SKIPPED_SPEAKERS.has(normalizedSpeaker)) {
      return;
    }
    const text = cleanPlotLine(String(rawText ?? ""));
    if (!text) {
      return;
    }
    const bucket = lines.get(normalizedSpeaker) ?? [];
    bucket.push(text);
    lines.set(normalizedSpeaker, bucket);
  };

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.Dialogues)) {
      for (const dialogue of record.Dialogues) {
        if (!dialogue || typeof dialogue !== "object") {
          continue;
        }
        const entry = dialogue as Record<string, unknown>;
        const speaker = String(entry.Speaker ?? entry.SpeakerName ?? "").trim();
        const plotLine = String(entry.PlotLineKey ?? entry.Text ?? "").trim();
        if (speaker && plotLine) {
          append(speaker, plotLine);
        }
      }
    }
    for (const value of Object.values(record)) {
      walk(value);
    }
  };

  walk(payload);
  return lines;
}
