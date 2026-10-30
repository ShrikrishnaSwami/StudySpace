import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
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

type CachedEmbedding = {
  content_hash: string;
  embedding: string | number[];
  source_id?: string | null;
  source_type?: string | null;
};

type CachedSourceReference = {
  content_hash: string;
  source_id: string | null;
  source_type: string | null;
};

// Keep embeddings that have not been used for 90 days out of the cache.
// This is a cache expiry policy, not deletion of the student's source material.
const EMBEDDING_CACHE_TTL_DAYS = 90;

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value) && value.length === EMBEDDING_DIMENSIONS && value.every((item) => typeof item === "number" && Number.isFinite(item))) {
    return value;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const values = trimmed.slice(1, -1).split(",").map(Number);
  if (values.length !== EMBEDDING_DIMENSIONS || values.some((item) => !Number.isFinite(item))) return null;
  return values;
}

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
  if (!candidates.length) return [];

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
  if (!embeddings?.length || embeddings.length !== candidates.length || embeddings.some((item) => item.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error("Gemini returned incomplete document embeddings.");
  }
  return embeddings;
}

function createUserSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Semantic retrieval with per-user, persistent embedding cache.
 * Only the current user's authorized context is considered. Existing document
 * embeddings are reused by content hash; only changed/new candidates are embedded.
 * If cache access or embedding fails, the lexical path remains available.
 */
export async function retrieveRelevantStudyContextHybrid(
  context: string,
  question: string,
  auth: { userId: string; accessToken: string; completeContext?: boolean },
): Promise<StudyContextRetrieval> {
  const lexical = retrieveRelevantStudyContext(context, question);
  if (process.env.STUDYSPACE_SEMANTIC_RETRIEVAL !== "true") return lexical;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !auth.userId || !auth.accessToken) return lexical;

  const candidates = getStudyContextEmbeddingCandidates(context, 40);
  if (!candidates.length) return lexical;
  // Enumerate all current chunks for safe per-source invalidation, while only embedding
  // the bounded 40-candidate set used for ranking. Avoid destructive cleanup if capped.
  const allSourceCandidates = auth.completeContext
    ? getStudyContextEmbeddingCandidates(context, 1000)
    : [];
  // A bounded recent context is intentionally partial. Never interpret records
  // omitted by its query limits as deleted student sources.
  const sourceEnumerationComplete = auth.completeContext === true && allSourceCandidates.length < 1000;

  try {
    const supabase = createUserSupabaseClient(auth.accessToken);
    const candidateHashes = candidates.map((candidate) => ({
      candidate,
      contentHash: hashText(candidate.text),
    }));
    const uniqueHashes = [...new Set(candidateHashes.map((item) => item.contentHash))];

    const [queryEmbedding, cacheResult] = await Promise.all([
      embedQuestion(question, apiKey),
      supabase
        .from("studyspace_ai_embeddings")
        .select("content_hash, embedding, source_id, source_type")
        .eq("user_id", auth.userId)
        .eq("model", EMBEDDING_MODEL)
        .in("content_hash", uniqueHashes),
    ]);

    const cachedByHash = new Map<string, number[]>();
    const cacheRows = (cacheResult.data || []) as CachedEmbedding[];
    const cachedSourceHashes = new Set<string>();
    if (cacheResult.error) {
      console.warn("StudySpace embedding cache read failed; regenerating embeddings.", {
        reason: cacheResult.error.message,
      });
    } else {
      for (const row of cacheRows) {
        if (row.source_id && row.source_type) cachedSourceHashes.add(row.content_hash);
        const parsed = parseVector(row.embedding);
        if (parsed) cachedByHash.set(row.content_hash, parsed);
      }
    }

    // Backfill source metadata for legacy cache hits without regenerating vectors.
    const metadataBackfill = candidateHashes.filter((item) =>
      cachedByHash.has(item.contentHash) && Boolean(item.candidate.sourceId)
      && Boolean(item.candidate.sourceType) && !cachedSourceHashes.has(item.contentHash)
    );
    for (const item of metadataBackfill) {
      const backfillResult = await supabase
        .from("studyspace_ai_embeddings")
        .update({
          source_id: item.candidate.sourceId,
          source_type: item.candidate.sourceType,
          source_label: String(item.candidate.title + " — " + item.candidate.source).slice(0, 500),
        })
        .eq("user_id", auth.userId)
        .eq("model", EMBEDDING_MODEL)
        .eq("content_hash", item.contentHash);
      if (backfillResult.error) {
        console.warn("StudySpace embedding source metadata backfill failed.", {
          reason: backfillResult.error.message,
        });
      }
    }
    // Associate cache entries with stable source records. When a source is present,
    // remove its obsolete chunk hashes only if the current context enumerated all chunks.
    // Deleted-source cleanup is restricted to complete, unfiltered student contexts and
    // record categories that the context loader fetches without a row limit.
    if (sourceEnumerationComplete) {
      const activeHashesBySource = new Map<string, Set<string>>();
      const activeIdsByType = new Map<string, Set<string>>();
      for (const item of allSourceCandidates) {
        if (!item.sourceId || !item.sourceType) continue;
        const key = item.sourceType + "::" + item.sourceId;
        const hashes = activeHashesBySource.get(key) || new Set<string>();
        hashes.add(hashText(item.text));
        activeHashesBySource.set(key, hashes);
        const ids = activeIdsByType.get(item.sourceType) || new Set<string>();
        ids.add(item.sourceId);
        activeIdsByType.set(item.sourceType, ids);
      }

      const sourceCacheResult = await supabase
        .from("studyspace_ai_embeddings")
        .select("content_hash, source_id, source_type")
        .eq("user_id", auth.userId)
        .eq("model", EMBEDDING_MODEL)
        .not("source_id", "is", null)
        .not("source_type", "is", null);

      if (sourceCacheResult.error) {
        console.warn("StudySpace source cache cleanup lookup failed.", {
          reason: sourceCacheResult.error.message,
        });
      } else {
        const staleByType = new Map<string, Set<string>>();
        for (const row of (sourceCacheResult.data || []) as CachedSourceReference[]) {
          if (!row.source_id || !row.source_type) continue;
          const key = row.source_type + "::" + row.source_id;
          const activeHashes = activeHashesBySource.get(key);
          const isCompleteType = [
            "STUDENT COURSES", "COURSE NOTES", "COURSE MATERIALS",
            "ASSIGNMENTS", "QUIZZES", "HOMEWORK",
          ].includes(row.source_type);
          const deletedSource = auth.completeContext === true && isCompleteType
            && !activeIdsByType.get(row.source_type)?.has(row.source_id);
          const changedSource = activeHashes !== undefined && !activeHashes.has(row.content_hash);
          if (deletedSource || changedSource) {
            const ids = staleByType.get(row.source_type) || new Set<string>();
            ids.add(row.source_id);
            staleByType.set(row.source_type, ids);
          }
        }

        for (const [sourceType, sourceIds] of staleByType) {
          const cleanup = await supabase
            .from("studyspace_ai_embeddings")
            .delete()
            .eq("user_id", auth.userId)
            .eq("model", EMBEDDING_MODEL)
            .eq("source_type", sourceType)
            .in("source_id", [...sourceIds]);
          if (cleanup.error) {
            console.warn("StudySpace source-linked embedding cleanup failed.", {
              sourceType,
              reason: cleanup.error.message,
            });
          }
        }
      }
    }

    // Refresh last_used_at for cache hits so frequently used material stays warm.
    // All operations are scoped to the authenticated user's own rows (RLS + user_id).
    const cachedHashes = [...cachedByHash.keys()];
    if (cachedHashes.length) {
      const touchResult = await supabase
        .from("studyspace_ai_embeddings")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", auth.userId)
        .eq("model", EMBEDDING_MODEL)
        .in("content_hash", cachedHashes);
      if (touchResult.error) {
        console.warn("StudySpace embedding cache usage timestamp update failed.", {
          reason: touchResult.error.message,
        });
      }
    }

    // Expire cache entries not used for 90 days. The index on (user_id, last_used_at)
    // keeps this bounded, and this never touches source records or another user's cache.
    const expiry = new Date(Date.now() - EMBEDDING_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const cleanupResult = await supabase
      .from("studyspace_ai_embeddings")
      .delete()
      .eq("user_id", auth.userId)
      .lt("last_used_at", expiry);
    if (cleanupResult.error) {
      console.warn("StudySpace expired embedding cleanup failed.", {
        reason: cleanupResult.error.message,
      });
    }

    const missing = candidateHashes.filter((item) => !cachedByHash.has(item.contentHash));
    const missingByHash = new Map<string, StudyContextEmbeddingCandidate>();
    for (const item of missing) missingByHash.set(item.contentHash, item.candidate);
    const missingEntries = [...missingByHash.entries()];
    const newVectors = await embedCandidates(missingEntries.map(([, candidate]) => candidate), apiKey);

    const rowsToSave = missingEntries.map(([contentHash, candidate], index) => ({
      user_id: auth.userId,
      content_hash: contentHash,
      model: EMBEDDING_MODEL,
      source_label: `${candidate.title} — ${candidate.source}`.slice(0, 500),
      source_id: candidate.sourceId || null,
      source_type: candidate.sourceType || candidate.title,
      embedding: `[${newVectors[index].join(",")}]`,
      updated_at: new Date().toISOString(),
    }));

    if (rowsToSave.length) {
      const saveResult = await supabase
        .from("studyspace_ai_embeddings")
        .upsert(rowsToSave, { onConflict: "user_id,content_hash,model" });
      if (saveResult.error) {
        // Search can still use fresh vectors for this request; cache persistence is best-effort.
        console.warn("StudySpace embedding cache write failed.", {
          reason: saveResult.error.message,
        });
      }
    }

    for (let index = 0; index < missingEntries.length; index += 1) {
      cachedByHash.set(missingEntries[index][0], newVectors[index]);
    }

    const semanticScores: Record<string, number> = {};
    for (const item of candidateHashes) {
      const vector = cachedByHash.get(item.contentHash);
      if (vector) semanticScores[item.candidate.id] = cosineSimilarity(queryEmbedding, vector);
    }

    if (!Object.keys(semanticScores).length) return lexical;
    return retrieveRelevantStudyContext(context, question, { semanticScores });
  } catch (error) {
    console.warn("StudySpace semantic retrieval failed; using lexical retrieval.", {
      reason: error instanceof Error ? error.message : "Unknown embedding error",
    });
    return lexical;
  }
}
