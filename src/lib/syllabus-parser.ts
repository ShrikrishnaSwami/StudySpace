export type ParsedSyllabusResponse = { events?: unknown[] };

export function parseSyllabusAiJson(value: string): ParsedSyllabusResponse {
  const cleaned = value
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ParsedSyllabusResponse;
    }
  } catch {
    // Recover the first complete JSON object when a provider adds surrounding prose.
    const start = cleaned.indexOf("{");
    if (start >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = start; i < cleaned.length; i += 1) {
        const char = cleaned[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === "\\\\") escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === '"') inString = true;
        else if (char === "{") depth += 1;
        else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            const parsed = JSON.parse(cleaned.slice(start, i + 1)) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return parsed as ParsedSyllabusResponse;
            }
            break;
          }
        }
      }
    }
  }

  throw new Error("The AI response did not contain a valid JSON object.");
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}
