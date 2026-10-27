export type RetrievedStudySection = {
  title: string;
  content: string;
  score: number;
};

export type StudyContextRetrieval = {
  context: string;
  sections: Array<{ title: string; score: number }>;
  strategy: "lexical-v1";
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

const SECTION_SEPARATOR = /\n\s*={8,}\s*\n/g;
const MAX_SECTION_CHARS = 5200;
const MAX_CONTEXT_CHARS = 14500;

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function sectionTitle(content: string, index: number): string {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines.find((line) => /^[A-Z][A-Z /_-]{2,}$/.test(line));
  return title || `StudySpace section ${index + 1}`;
}

function splitSections(context: string): RetrievedStudySection[] {
  const parts = context.split(SECTION_SEPARATOR).map((part) => part.trim());
  const sections: RetrievedStudySection[] = [];

  // The context formatter places a separator above and below each section
  // title. Pair that title with the following body so ranking never separates
  // a heading from the student data it describes.
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;

    const isHeading = /^[A-Z][A-Z /_-]{2,}$/.test(part);
    if (isHeading) {
      const body = parts[index + 1] || "";
      sections.push({
        title: part,
        content: (part + "\n\n" + body).slice(0, MAX_SECTION_CHARS),
        score: 0,
      });
      index += 1;
      continue;
    }

    sections.push({
      title: sectionTitle(part, sections.length),
      content: part.slice(0, MAX_SECTION_CHARS),
      score: 0,
    });
  }

  return sections;
}

function scoreSection(queryTokens: string[], section: RetrievedStudySection): number {
  if (!queryTokens.length) return 0;
  const tokens = tokenize(section.content);
  if (!tokens.length) return 0;

  const frequencies = new Map<string, number>();
  for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);

  const uniqueTokens = new Set(tokens);
  let score = 0;
  for (const queryToken of new Set(queryTokens)) {
    const frequency = frequencies.get(queryToken) || 0;
    if (frequency) {
      // Saturating term frequency avoids letting a huge section dominate the ranking.
      score += (1 + Math.log(1 + frequency)) * (1 + Math.log(1 + tokens.length / uniqueTokens.size));
    }
    if (section.title.toLowerCase().includes(queryToken)) score += 2.5;
  }

  const normalizedQuery = queryTokens.join(" ");
  const normalizedTitle = tokenize(section.title).join(" ");
  if (normalizedTitle && normalizedQuery.includes(normalizedTitle)) score += 4;
  return score;
}

/**
 * Lightweight lexical retrieval baseline for student-owned StudySpace context.
 * This deliberately avoids external embedding services and never crosses users:
 * the caller must pass only context already loaded for the authenticated student.
 */
export function retrieveRelevantStudyContext(
  context: string,
  question: string,
  options: { maxSections?: number; maxCharacters?: number } = {},
): StudyContextRetrieval {
  const maxSections = Math.max(1, Math.min(options.maxSections ?? 5, 8));
  const maxCharacters = Math.max(1000, Math.min(options.maxCharacters ?? MAX_CONTEXT_CHARS, 20000));
  const sections = splitSections(context);
  const queryTokens = tokenize(question);

  if (!sections.length) {
    return { context: "No StudySpace context is available.", sections: [], strategy: "lexical-v1" };
  }

  const ranked = sections
    .map((section) => ({ ...section, score: scoreSection(queryTokens, section) }))
    .sort((a, b) => b.score - a.score);

  // For broad planning prompts, keep the factual overview sections even when
  // exact lexical overlap is low; the model can reason over a bounded context.
  const selected = ranked
    .filter((section) => section.score > 0)
    .slice(0, maxSections);

  if (!selected.length) {
    const overview = ranked.filter((section) =>
      /STUDENT COURSES|ASSIGNMENTS|CALENDAR|COURSE NOTES|QUIZ ATTEMPTS/i.test(section.title),
    ).slice(0, 3);
    selected.push(...overview);
  }

  if (!selected.length) selected.push(...ranked.slice(0, Math.min(2, maxSections)));

  const ordered = selected.sort((a, b) => sections.findIndex((s) => s.title === a.title) - sections.findIndex((s) => s.title === b.title));
  const output: string[] = [];
  let used = 0;
  for (const section of ordered) {
    const block = `SOURCE SECTION: ${section.title}\n${section.content}`;
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
    sections: selected.map(({ title, score }) => ({ title, score: Math.round(score * 100) / 100 })),
    strategy: "lexical-v1",
  };
}
