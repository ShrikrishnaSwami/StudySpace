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

This is still deterministic lexical retrieval. It is not an embedding model, vector search, or a model trained by StudySpace.

## Model ownership

`src/lib/studyspace-ai.ts` is the generation boundary and currently delegates to the configured existing provider. No Ollama dependency is required. The retrieval/orchestration layer is our own application code; model weights are not trained by this change.

## Evaluation

Synthetic cases in `src/lib/studyspace-retrieval-evaluation.json` contain no real student records. Regression tests in `src/lib/studyspace-retrieval.test.ts` cover expected categories, paraphrased queries, individual note selection, retrieval from later chunks of long notes, context bounds, empty context, and unmatched-question fallback.

Run with:

```powershell
npm run test:retrieval
```

The test suite should be run locally after pulling `main`. A green local test run verifies the tested retrieval cases, not production deployment or overall tutor accuracy.

## Next stages

1. Add reviewed, synthetic and anonymized evaluation examples and measure retrieval precision/recall.
2. Extract and chunk actual uploaded document text with stable source metadata (document, page, course) where the existing upload pipeline supports text extraction.
3. Evaluate an embedding model and storage strategy for semantic retrieval, retaining lexical fallback.
4. Benchmark generated answers for factual grounding, correctness, clarity, and citation accuracy.
5. Consider fine-tuning only after a suitable licensed/original dataset and measurable target are available.

## Manual smoke checks

- Ask about a distinctive phrase from one note and verify only the matching note is selected.
- Ask about an assignment using both "due date" and "when must I finish it?" wording.
- Ask a general academic question and verify the tutor distinguishes general knowledge from stored student data.
- Ask about a record that does not exist and verify it does not invent student-specific details.
- Verify unauthenticated requests are rejected and the existing AI quota remains applied.
