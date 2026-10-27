# StudySpace AI Engine: current design and roadmap

## What is implemented

The AI Tutor now passes its authenticated student's formatted StudySpace context through `src/lib/studyspace-retrieval.ts` before generation. Retrieval currently uses a lightweight lexical ranking baseline:

- Splits the existing context into named sections.
- Ranks sections by overlap with the student's question.
- Keeps a bounded number of relevant sections and a bounded prompt context.
- Returns the retrieval strategy and selected section names in the tutor API response.
- Operates only on context already loaded for the authenticated student; it does not query across users or create a separate shared knowledge store.

This is a useful baseline, not semantic search. It can miss relevant material when a question uses different wording from the notes. It does not yet provide precise document/page citations.

## Model ownership

`src/lib/studyspace-ai.ts` is the model-orchestration boundary. It currently delegates generation to the existing server-side provider adapter. No Ollama dependency is required, and no new model weights are shipped by this change.

The system is not yet a language model trained by StudySpace. Owning the orchestration and retrieval layer is the foundation for comparing models, building a dataset, and later fine-tuning an open-weight model.

## Next engineering stages

1. **Retrieval evaluation:** create a small, versioned set of questions and expected relevant sections. Track recall@k, prompt size, and latency before changing retrieval.
2. **Document-level retrieval:** normalize and chunk uploaded documents and course notes, preserve owner/course/document/page metadata, and return source references.
3. **Semantic retrieval:** add embeddings and vector search only after choosing the model/runtime and confirming how vectors will be generated and stored. Keep the lexical baseline as a fallback.
4. **Tutor quality evaluation:** assess correctness, groundedness, clarity, step-by-step reasoning, and whether the answer uses the right course material. Keep private student records out of evaluation fixtures.
5. **Model experiments:** benchmark candidate models on the same evaluation set, then consider fine-tuning on licensed or original educational examples if measured results justify it.

## Manual smoke checks

Use a signed-in test account with at least two courses and some notes:

- Ask about a distinctive term in one course's notes. The selected section list should include course notes.
- Ask about an upcoming deadline. The selected section list should include assignments or calendar data when the terms overlap.
- Ask an unrelated general academic question. The tutor should still answer from general knowledge without inventing student-specific records.
- Ask a question with no matching course terms. Retrieval should fall back to a small overview rather than sending the entire context.
- Verify that requests without a valid bearer token are rejected and that the existing AI quota is still applied.

A successful repository edit is not proof of a successful model response. Run these checks against a configured deployment before treating the AI behavior as verified.
