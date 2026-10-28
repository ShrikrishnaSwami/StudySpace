# StudySpace AI Engine: current design and roadmap

## Implemented

The authenticated AI Tutor formats the current student's courses, notes, resources, assignments, quizzes, quiz attempts, homework, and calendar, then retrieves a bounded subset before generation.

### Record-level retrieval

The retrieval baseline now ranks individual records (for example, one note or assignment) rather than treating an entire category as one indivisible block.

- Keeps category and record titles in each selected source label.
- Uses direct term matches and weighted, hand-authored synonym expansion.
- Filters generic category words (such as “notes” or “assignments”) when a query contains a specific topic, reducing unrelated record matches.
- Uses a small overview fallback for category-only or unmatched questions.
- Splits long records into overlapping, paragraph-aware chunks so relevant material later in a note is not lost to a single-record truncation.
- Keeps a stable group identity across chunks and selects at most one chunk per original record, reducing duplicate context.
- Limits selected records and total prompt context.
- Falls back to a small overview when there are no useful lexical matches.
- Returns record-level source labels to the tutor API for display.
- Only searches context already loaded for the authenticated student; it does not query another student's records.

### Hybrid semantic retrieval and source-linked cache

- Semantic retrieval is enabled by default when `GEMINI_API_KEY` and authenticated user context are available. Set `STUDYSPACE_SEMANTIC_RETRIEVAL=false` to force lexical-only retrieval.
- Formatted course, note, resource, assignment, quiz, homework, and calendar records now carry stable record IDs into retrieval candidates. Cache rows store `source_id` and `source_type` alongside content hashes.
- When all chunks for a currently loaded source are enumerated, obsolete cached chunks for that source are deleted. When a full, unfiltered student context is loaded, stale cache entries for deleted courses, notes, resources, assignments, quizzes, and homework are also removed. Cleanup avoids course-filtered contexts and categories whose loaded records are capped, and remains best-effort.

### Optional semantic retrieval

- Adds a Gemini embedding-based semantic scoring path for up to 40 category-balanced record/chunk candidates per tutor request.
- Combines semantic similarity with the existing lexical ranking and preserves the same context limits and source labels.
- Semantic retrieval is enabled by default when `GEMINI_API_KEY` and authenticated user context are available. Set `STUDYSPACE_SEMANTIC_RETRIEVAL=false` to force lexical-only retrieval; when the embedding service fails, the tutor falls back to lexical retrieval.
- Uses `GEMINI_API_KEY` server-side only. Document embeddings are persisted in `studyspace_ai_embeddings` and keyed by the SHA-256 hash of candidate text plus the embedding model. Unchanged candidates reuse cached vectors; new or changed candidates are embedded and cached. The question is embedded for each request.
- The cache table has row-level security policies that scope every read/write to the authenticated user's own `auth.uid()`. It uses the caller's access token and publishable/anon key; no service-role key is required.
- Cache writes are best-effort: if they fail, fresh vectors can still be used for the current request, and lexical retrieval remains the fallback if semantic retrieval fails.
- Cache vectors record `last_used_at`. Cache hits refresh that timestamp, and each successful semantic retrieval attempts to delete only the current user's embeddings unused for 90 days. The cleanup is bounded by an index on `(user_id, last_used_at)` and cannot delete source notes or another user's vectors. Cleanup failures are logged and do not block tutoring.
- Expiry is deliberately conservative: it removes inactive cache entries, not student source material. Stable record IDs now flow through supported formatted record chunks. When a source appears in a complete candidate enumeration, obsolete hashes for that source are removed; deleted-source cleanup is best-effort and only runs for unfiltered context categories known to be loaded completely. Legacy cache rows are associated with source metadata when matching candidates are reused. Existing cache rows without source metadata remain eligible for TTL cleanup.

This is retrieval infrastructure, not a model trained by StudySpace. The Gemini embedding model supplies vectors; StudySpace performs candidate selection, cosine similarity, ranking, and fallback logic.

## Model ownership

`src/lib/studyspace-ai.ts` is the generation boundary and currently delegates to the configured existing provider. No Ollama dependency is required. The retrieval/orchestration layer is our own application code; model weights are not trained by this change.

## Evaluation

Synthetic cases in `src/lib/studyspace-retrieval-evaluation.json` contain no real student records. Regression tests in `src/lib/studyspace-retrieval.test.ts` cover expected categories, paraphrased queries, semantic-score reranking, individual note selection, retrieval from later chunks of long notes, context bounds, empty context, and unmatched-question fallback.

Run with:

```powershell
npm run test:retrieval
```

The test suite should be run locally after pulling `main`. A green local test run verifies the tested retrieval cases, not production deployment or overall tutor accuracy.

## Feedback and model improvement

- The tutor now exposes per-answer helpful / not-helpful controls. Feedback is stored in `ai_tutor_feedback`, scoped by RLS to the owning student and conversation. It is a human quality signal; it does not automatically change model weights or personalize future model parameters.
- The tutor prompt supports adaptive teaching patterns: hints before solutions when requested, one-question-at-a-time quizzing, stepwise calculations, diagnosis of attempted work, and switching explanations when a student is stuck.
- Synthetic retrieval regression tests now include stable source metadata. Keep evaluation fixtures synthetic; do not use private student notes or chat logs as a training corpus without explicit, informed consent and a privacy review.

## Next stages

1. Expand reviewed synthetic evaluation cases and report retrieval precision/recall, citation support, answer correctness, and latency/cost.
2. Extract uploaded documents into page-aware chunks with stable document/page/course IDs where the upload pipeline supports text extraction.
3. Add an admin-only, privacy-preserving feedback review/export workflow and human review before any dataset is used for fine-tuning.
4. Benchmark generated answers for factual grounding, correctness, clarity, and citation accuracy across providers/models.
5. Consider fine-tuning only after a suitable licensed/original dataset, evaluation baseline, budget, and measurable target are available. The hosted provider model is not being trained by this repository change.

## Manual smoke checks

- Ask about a distinctive phrase from one note and verify only the matching note is selected.
- Ask about an assignment using both "due date" and "when must I finish it?" wording.
- Ask a general academic question and verify the tutor distinguishes general knowledge from stored student data.
- Ask about a record that does not exist and verify it does not invent student-specific details.
- Verify unauthenticated requests are rejected and the existing AI quota remains applied.
