export type RetrievedStudySection = {
  title: string;
  source: string;
  content: string;
  score: number;
};

export type StudyContextRetrieval = {
  context: string;
  sections: Array<{ title: string; source: string; score: number }>;
  strategy: "record-lexical-expanded-v3";
};

const STOP_WORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any",
  "are", "as", "at", "be", "because", "been", "before", "being", "between",
  "both", "but", "by", "can", "could", "did", "do", "does", "for", "from",
  "get", "got", "had", "has", "have", "he", "her", "here", "hers", "him",
  "his", "how", "i", "if", "in", "into", "is", "it", "its", "just", "me",
  "more", "most", "my", "no", "not", "of", "on", "one", "or", "our", "out",
  "please", "she", "should", "so", "some", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "this", "those", "to", "too",
  "us", "very", "was", "we", "were", "what", "when", "where", "which",
  "who", "why", "will", "with", "would", "you", "your",
]);

// Category words identify the kind of record, but are weak evidence that a
// particular record answers the question. When a query has specific terms,
// score those terms instead of letting "notes" match every note.
const FILLER_QUERY_TOKENS = new Set([
  "coming", "up", "show", "find", "list", "give", "tell", "display",
  "information", "info", "overview", "study",
]);

const GENERIC_QUERY_TOKENS = new Set([
  "note", "notes", "material", "materials", "study", "guide",
  "course", "courses", "class", "classes", "subject", "subjects",
  "assignment", "assignments", "task", "tasks", "quiz", "quizzes",
  "test", "tests", "exam", "exams", "assessment", "assessments",
  "calendar", "event", "events", "homework", "resource", "resources",
  "student", "data",
]);

const SYNONYM_GROUPS: string[][] = [
  ["assignment", "assignments", "task", "tasks", "coursework", "work"],
  ["due", "deadline", "deadlines", "finish", "submit", "submission", "submissions"],
  ["professor", "instructor", "teacher", "lecturer", "teaches", "taught"],
  ["schedule", "timetable", "class", "classes", "lecture", "lectures", "attend"],
  ["grade", "grades", "score", "scores", "mark", "marks", "result", "results", "performance"],
  ["quiz", "quizzes", "test", "tests", "exam", "exams", "assessment", "assessments"],
  ["notes", "note", "material", "materials", "study guide", "lecture notes"],
  ["calendar", "event", "events", "appointment", "appointments", "upcoming"],
  ["course", "courses", "class", "classes", "subject", "subjects"],
  ["explain", "describe", "teach", "meaning", "understand"],
];

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

const TOKEN_SYNONYMS = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const tokens = new Set(group.flatMap((term) => tokenize(term)));
  for (const token of tokens) {
    const aliases = TOKEN_SYNONYMS.get(token) || new Set<string>();
    for (const alias of tokens) aliases.add(alias);
    TOKEN_SYNONYMS.set(token, aliases);
  }
}

const SECTION_SEPARATOR = /\n\s*={8,}\s*\n/g;
const RECORD_START = /(?:^|\n)\s*(COURSE|NOTE|RESOURCE|ASSIGNMENT|QUIZ|ATTEMPT|HOMEWORK|EVENT)\s+\d+\s*(?=\n|$)/g;
const MAX_RECORD_CHARS = 3200;
const MAX_CONTEXT_CHARS = 14500;

function extractField(record: string, field: string): string {
  const match = record.match(new RegExp("(?:^|\n)" + field + ":[ \\t]*(?:\r?\n[ \\t]*)?([^\r\n]+)", "i"));
  return match?.[1]?.trim() || "";
}

function splitRecords(context: string): RetrievedStudySection[] {
  const parts = context.split(SECTION_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  const records: RetrievedStudySection[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!/^[A-Z][A-Z /_-]{2,}$/.test(part)) continue;

    const category = part;
    const body = parts[index + 1] || "";
    const starts = [...body.matchAll(RECORD_START)];
    if (!starts.length) {
      if (body) records.push({ title: category, source: category, content: (category + "\n\n" + body).slice(0, MAX_RECORD_CHARS), score: 0 });
      index += 1;
      continue;
    }

    for (let recordIndex = 0; recordIndex < starts.length; recordIndex += 1) {
      const start = starts[recordIndex].index ?? 0;
      const end = recordIndex + 1 < starts.length ? (starts[recordIndex + 1].index ?? body.length) : body.length;
      const rawRecord = body.slice(start, end).trim();
      if (!rawRecord) continue;
      const heading = rawRecord.split(/\r?\n/, 1)[0].trim();
      const itemTitle = extractField(rawRecord, "Title") || extractField(rawRecord, "Name");
      const source = itemTitle ? `${heading}: ${itemTitle}` : heading;
      records.push({
        title: category,
        source,
        content: rawRecord.slice(0, MAX_RECORD_CHARS),
        score: 0,
      });
    }
    index += 1;
  }

  return records;
}

function buildQueryWeights(queryTokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  const uniqueTokens = [...new Set(queryTokens)];
  const specificTokens = uniqueTokens.filter(
    (token) => !GENERIC_QUERY_TOKENS.has(token) && !FILLER_QUERY_TOKENS.has(token),
  );
  const categoryTokens = uniqueTokens.filter(
    (token) => GENERIC_QUERY_TOKENS.has(token) && !FILLER_QUERY_TOKENS.has(token),
  );

  // Prefer topic-specific terms, but still expand category terms into useful
  // aliases (e.g. "events" -> "calendar") without letting generic words such
  // as "notes" match every record.
  const scoringTokens = specificTokens.length ? specificTokens : categoryTokens;

  for (const token of scoringTokens) {
    if (!GENERIC_QUERY_TOKENS.has(token) && !FILLER_QUERY_TOKENS.has(token)) {
      weights.set(token, 1);
    }
    for (const alias of TOKEN_SYNONYMS.get(token) || []) {
      if (
        alias !== token &&
        !weights.has(alias) &&
        (!GENERIC_QUERY_TOKENS.has(alias) || specificTokens.length === 0) &&
        !FILLER_QUERY_TOKENS.has(alias)
      ) {
        weights.set(alias, 0.42);
      }
    }
  }
  return weights;
}

function scoreRecord(queryWeights: Map<string, number>, queryTokens: string[], record: RetrievedStudySection): number {
  if (!queryWeights.size) return 0;
  // Ignore the generated record marker and category label when scoring.
  // Words like "notes" in the question should not make every note equally relevant.
  const searchableContent = record.content.replace(/^(?:COURSE|NOTE|RESOURCE|ASSIGNMENT|QUIZ|ATTEMPT|HOMEWORK|EVENT)\s+\d+\s*\r?\n/i, "");
  const tokens = tokenize(searchableContent);
  if (!tokens.length) return 0;

  const frequencies = new Map<string, number>();
  for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
  const uniqueTokens = new Set(tokens);
  const categoryTokens = new Set(tokenize(record.title));
  let score = 0;

  for (const [token, weight] of queryWeights) {
    const frequency = frequencies.get(token) || 0;
    if (frequency) score += weight * (1 + Math.log(1 + frequency)) * (1 + Math.log(1 + tokens.length / uniqueTokens.size));
    const sourceTitle = record.source.replace(/^(?:COURSE|NOTE|RESOURCE|ASSIGNMENT|QUIZ|ATTEMPT|HOMEWORK|EVENT)\s+\d+\s*:\s*/i, "");
    if (sourceTitle.toLowerCase().includes(token)) score += weight * (weight === 1 ? 3 : 1.2);
    if (categoryTokens.has(token)) score += weight * 1.5;
  }

  const normalizedQuery = queryTokens.join(" ");
  const normalizedSource = tokenize(record.source).join(" ");
  if (normalizedSource && normalizedQuery.includes(normalizedSource)) score += 4;
  return score;
}

/**
 * Retrieves individual student records instead of whole database categories.
 * This is weighted lexical search with explicit synonym expansion, not embeddings.
 * The caller must provide only data already authorized for the current student.
 */
export function retrieveRelevantStudyContext(
  context: string,
  question: string,
  options: { maxSections?: number; maxCharacters?: number } = {},
): StudyContextRetrieval {
  const maxSections = Math.max(1, Math.min(options.maxSections ?? 5, 8));
  const maxCharacters = Math.max(1000, Math.min(options.maxCharacters ?? MAX_CONTEXT_CHARS, 20000));
  const records = splitRecords(context);
  const queryTokens = tokenize(question);

  if (!records.length) {
    return { context: "No StudySpace context is available.", sections: [], strategy: "record-lexical-expanded-v3" };
  }

  const weights = buildQueryWeights(queryTokens);
  const ranked = records.map((record) => ({ ...record, score: scoreRecord(weights, queryTokens, record) }))
    .sort((a, b) => b.score - a.score);

  let selected = ranked.filter((record) => record.score > 0).slice(0, maxSections);
  if (!selected.length) {
    selected = ranked.filter((record) => /STUDENT COURSES|ASSIGNMENTS|CALENDAR|COURSE NOTES|QUIZ ATTEMPTS|HOMEWORK/i.test(record.title))
      .slice(0, Math.min(3, maxSections));
  }
  if (!selected.length) selected = ranked.slice(0, Math.min(2, maxSections));

  const output: string[] = [];
  let used = 0;
  for (const record of selected) {
    const block = `SOURCE: ${record.title} — ${record.source}\n${record.content}`;
    if (used + block.length > maxCharacters) {
      const remaining = maxCharacters - used;
      if (remaining > 250) output.push(block.slice(0, remaining));
      break;
    }
    output.push(block);
    used += block.length + 2;
  }

  return {
    context: output.join("\n\n") || "No relevant StudySpace context matched this question.",
    sections: selected.map(({ title, source, score }) => ({ title, source, score: Math.round(score * 100) / 100 })),
    strategy: "record-lexical-expanded-v3",
  };
}
