import "server-only";

import {
  getStudyContextEmbeddingCandidates,
  retrieveRelevantStudyContext,
  type StudyContextEmbeddingCandidate,
  type StudyContextRetrieval,
} from "@/lib/studyspace-retrieval";

const EMBEDDING_MODEL = process.env.STUDYSPACE_EMBEDDING_MODEL || "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

type EmbeddingResponse = {
  embedding?: { values?: number[] };
  embeddings?: Array<{ values?: number[] }>;
};

async function postGeminiEmbedding<T>(path: string, apiKey: string, body: unknown): Promise<T> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    // Do not include response bodies: provider errors can contain request details.
    throw new Error(`Gemini embeddings returned HTTP ${response.status}`);
  }

  return await response.json() as T;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function embedQuestion(question: string, apiKey: string): Promise<number[]> {
  const result = await postGeminiEmbedding<EmbeddingResponse>(
    `${EMBEDDING_MODEL}:embedContent`,
    apiKey,
    {
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: question.slice(0, 12000) }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  );

  const values = result.embedding?.values;
  if (!values?.length) throw new Error("Gemini returned no query embedding.");
  return values;
}

async function embedCandidates(
  candidates: StudyContextEmbeddingCandidate[],
  apiKey: string,
): Promise<number[][]> {
  const result = await postGeminiEmbedding<EmbeddingResponse>(
    `${EMBEDDING_MODEL}:batchEmbedContents`,
    apiKey,
    {
      requests: candidates.map((candidate) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: candidate.text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    },
  );

  const embeddings = result.embeddings?.map((item) => item.values || []);
  if (!embeddings?.length || embeddings.length !== candidates.length || embeddings.some((item) => !item.length)) {
    throw new Error("Gemini returned incomplete document embeddings.");
  }
  return embeddings;
}

/**
 * Opt-in semantic retrieval. Lexical retrieval remains the no-cost fallback if
 * embeddings are disabled, unavailable, or return an invalid response.
 */
export async function retrieveRelevantStudyContextHybrid(
  context: string,
  question: string,
): Promise<StudyContextRetrieval> {
  const lexical = retrieveRelevantStudyContext(context, question);
  if (process.env.STUDYSPACE_SEMANTIC_RETRIEVAL !== "true") return lexical;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return lexical;

  const candidates = getStudyContextEmbeddingCandidates(context, 40);
  if (!candidates.length) return lexical;

  try {
    const [queryEmbedding, documentEmbeddings] = await Promise.all([
      embedQuestion(question, apiKey),
      embedCandidates(candidates, apiKey),
    ]);

    const semanticScores: Record<string, number> = {};
    for (let index = 0; index < candidates.length; index += 1) {
      semanticScores[candidates[index].id] = cosineSimilarity(queryEmbedding, documentEmbeddings[index]);
    }

    return retrieveRelevantStudyContext(context, question, { semanticScores });
  } catch (error) {
    console.warn("StudySpace semantic retrieval failed; using lexical retrieval.", {
      reason: error instanceof Error ? error.message : "Unknown embedding error",
    });
    return lexical;
  }
}
