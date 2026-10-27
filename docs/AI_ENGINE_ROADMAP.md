# StudySpace AI Engine: current design and roadmap

## What is implemented

The AI Tutor passes the authenticated student's formatted StudySpace context through `src/lib/studyspace-retrieval.ts` before generation. Retrieval uses a deterministic query-expanded lexical ranking baseline:

- Splits the existing context into named sections and keeps headings attached to their data.
- Ranks sections by direct word overlap plus lower-weight synonyms for common academic terms (for example, instructor/professor, coursework/assignment, assessment/quiz, and deadline/due date).
- Gives exact wording more weight than synonym matches to limit false positives.
- Keeps a bounded number of relevant sections and a bounded prompt context.
- Returns the retrieval strategy and selected section names in the tutor API response.
- Operates only on context already loaded for the authenticated student; it does not query across users or create a separate shared knowledge store.

This is a stronger lexical baseline, **not embedding-based semantic search**. Synonym groups are hand-authored and will not understand arbitrary paraphrases or meaning the way a good embedding model can.

## Model ownership

`src/lib/studyspace-ai.ts` is the model-orchestration boundary. It currently delegates generation to the existing server-side provider adapter. No Ollama dependency is required, and no new model weights are shipped by this change.

The system is not yet a language model trained by StudySpace. Owning the orchestration and retrieval layer is the foundation for comparing models, building a dataset, and later fine-tuning an open-weight model.

## Next engineering stages

1. **Retrieval evaluation:** expand the versioned synthetic question set and run regression tests whenever ranking behavior changes.
2. **Document-level retrieval:** normalize and chunk uploaded documents and course notes, preserve owner/course/document/page metadata, and return source references.
3. **Embedding-based semantic retrieval:** choose an embedding model/runtime and storage strategy, then add vector search with lexical fallback. Keep vector generation and storage scoped to the authenticated student's records.
4. **Tutor quality evaluation:** assess correctness, groundedness, clarity, step-by-step reasoning, and whether the answer uses the right course material. Keep private student records out of evaluation fixtures.
5. **Model experiments:** benchmark candidate models on the same evaluation set, then consider fine-tuning on licensed or original educational examples if measured results justify it.

## Retrieval evaluation baseline

Synthetic cases live in `src/lib/studyspace-retrieval-evaluation.json`. They cover course details, assignment deadlines, notes, quiz performance, calendar events, and paraphrased queries; no real student records are included. Regression tests in `src/lib/studyspace-retrieval.test.ts` check expected-section retrieval, synonym expansion, context/section bounds, empty-context behavior, and unmatched-question fallback.

Run them with `npm run test:retrieval` on Node.js 22.6+ (built-in TypeScript type stripping). This is a small regression set, not a statistically meaningful benchmark; expand it with reviewed examples before comparing models or claiming quality improvements.

## Manual smoke checks

Use a signed-in test account with at least two courses and some notes:

- Ask about a distinctive term in one course's notes. The selected section list should include course notes.
- Ask about an upcoming deadline using both "due date" and "when must I finish it?" wording. Relevant assignments should be selected.
- Ask an unrelated general academic question. The tutor should still answer from general knowledge without inventing student-specific records.
- Ask a question with no matching course terms. Retrieval should fall back to a small overview rather than sending the entire context.
- Verify that requests without a valid bearer token are rejected and that the existing AI quota is still applied.

A successful repository edit is not proof of a successful model response. Run the tests and these checks against a configured deployment before treating the AI behavior as verified.
