# AI latency and model routing

StudySpace routes AI work through the server-only adapter in `src/lib/gemini.ts`. The goal is to choose a low-latency model appropriate to the task, keep prompts and outputs bounded, and move to a different supported model when a provider reports a transient failure.

## Current default model assignment

| Task | Default primary | Fallback order | Why |
| --- | --- | --- | --- |
| AI Tutor | `gemini-3.6-flash` | `gemini-3.5-flash-lite`, then `gemini-3.7-flash` | Balanced conversational speed and explanation quality |
| Quiz generation | `gemini-3.6-flash` | `gemini-3.5-flash-lite`, then `gemini-3.7-flash` | Structured question quality without defaulting to the most expensive/slowest reasoning path |
| Homework analysis | `gemini-3.6-flash` | `gemini-3.5-flash-lite`, then `gemini-3.7-flash` | Multimodal input support with a bounded fallback path |
| Syllabus extraction | `gemini-3.6-flash` | `gemini-3.5-flash-lite`, then `gemini-3.7-flash` | Document extraction with conservative output size |
| Flashcards | `gemini-3.5-flash-lite` | `gemini-3.6-flash`, then `gemini-3.7-flash` | High-volume concise generation |
| Recommendations | `gemini-3.5-flash-lite` | `gemini-3.6-flash`, then `gemini-3.7-flash` | Short structured output and lower latency |

Model availability and quotas depend on the provider project. The models above are supported model IDs listed by Google's [Gemini API model documentation](https://ai.google.dev/gemini-api/docs/models); if a model is unavailable to the project's key, the adapter attempts a different configured model.

## Configuration

Optional server-side variables:

- `GEMINI_TUTOR_MODEL`: override the Tutor primary.
- `GEMINI_REASONING_MODEL`: override quiz, homework, and syllabus primary.
- `GEMINI_FAST_MODEL`: override flashcard and recommendation primary.
- `GEMINI_FALLBACK_MODEL`: add a preferred fallback after the task's primary.

The legacy `GEMINI_MODEL` variable is not used as a universal primary override anymore because it forced all tasks onto one model, including during the recorded high-demand errors. Do not configure OpenAI or Anthropic routing unless those provider keys and model IDs are actually provisioned; those services may incur separate charges.

## Latency improvements

- The Gemini HTTP timeout is bounded at 20 seconds rather than 45 seconds.
- Each model is attempted at most once per generation path; the adapter does not repeat a saturated primary model before trying a fallback.
- Output token ceilings are task-specific to avoid needlessly long generations.
- Text generation uses the shared adapter. Homework's multimodal route now uses the same task routing, output limits, and fallback policy.
- The Tutor streams output and logs safe timing metadata: model/task, time to first token, total generation duration, and prompt/output character counts. It does not log the student's message or prompt contents.
- Tutor context loading and retrieval timings are logged separately. Lexical retrieval is the default; semantic embeddings are opt-in with `STUDYSPACE_SEMANTIC_RETRIEVAL=true` because they add an external request and can increase latency.
- The Tutor browser request has a 75-second timeout and shows a useful retry message instead of leaving the interface waiting indefinitely.

## What to measure

Compare time to first token and total time separately. A useful target for a normal text Tutor question is to show the first token as soon as practical and avoid multi-minute requests; complex file analysis can take longer. Compare typical requests with slow outliers and include model/status details from Vercel logs. Never log API keys, full prompts, student messages, private file paths, or student record contents.

Streaming improves perceived latency but does not guarantee a shorter total generation time. Provider congestion, rate limits, database latency, large uploaded files, and hosting limits can still affect the response.
