# StudySpace AI evaluation and provider architecture

## Specialist systems

StudySpace uses task-specialised AI workflows rather than one generic chatbot:

| Specialist | Tasks | Responsibility |
| --- | --- | --- |
| Tutor AI | Tutor | Course-aware explanations, guided problem solving, and learning support |
| Research AI | Notes, syllabus | Document understanding, note extraction, and evidence-grounded summaries |
| Assessment AI | Quiz, homework, grading | Question generation, assignment feedback, and rubric-based assessment |
| Memory AI | Flashcards | Active recall, spaced review content, and concise flashcard generation |
| Planner AI | Recommendations | Study priorities and recommendations grounded in the student's own records |

These are specialised application-level agents. They share the secure provider adapter but retain task-specific instructions, context boundaries, output formats, and evaluation criteria.

## Cloud provider strategy

- **Gemini** is the primary provider for Tutor AI and supports the existing multimodal and PDF workflows.
- **Groq** is the preferred provider for Research/Assessment and quick-study text tasks when its API key is configured. Specialist tasks use different Groq model families by default. Free developer-tier limits depend on the selected model and account. Groq documents that inference inputs/outputs are not retained by default, but reliability/abuse logs may contain request data for up to 30 days. Enable Groq Zero Data Retention in its console before sending real student records.
- **OpenRouter** is an optional provider for free model variants. StudySpace permits only `openrouter/free` or model IDs ending in `:free` so an ordinary configuration cannot route to paid models. It is disabled for student data unless `OPENROUTER_ALLOW_STUDENT_DATA=true` is explicitly set. Some free model providers may log prompts or use them to improve models; do not enable this for real student coursework or personal data unless the provider's current terms and required student consent have been reviewed.

Provider credentials are server-only. Requests are routed through the server; browser clients never receive provider keys. When a configured provider is unavailable, the server tries another configured provider. Providers without credentials are skipped.

The existing Gemini multimodal paths (PDF and inline file parts) remain Gemini-only; text workflows can use the cloud provider fallback chain. Streaming tutor responses continue to use Gemini streaming when Gemini is the selected provider; other providers currently use a non-streaming response through the same API contract.

## Free-tier limitations

"Free" means no per-token charge under the provider's free allowance, not unlimited or guaranteed service. Providers can change model availability, quotas, and terms. Free-tier exhaustion should result in a temporary availability response rather than a paid-model fallback. OpenRouter free-model limits are particularly restrictive, so it should be treated as a fallback and development option rather than guaranteed production capacity. Privacy is a separate requirement from price: never route private student material to a provider until its data handling terms, retention settings, and required notices/consents have been reviewed.

No provider is enabled merely by adding this code. An administrator must add the relevant server-side API key in the deployment environment and select the provider. Never commit real keys or expose them through `NEXT_PUBLIC_*` variables.

## Evaluation areas

- Correctness and clarity of academic explanations.
- Relevance to the user's question and available study context.
- Quality and answerability of generated quizzes and flashcards.
- Usefulness and fairness of coursework feedback.
- Robust handling of empty, ambiguous, unsupported, or malformed input.
- Clear communication when the AI cannot complete a request.
- Response time and resilience during provider interruptions.
- Consistent behaviour across providers for the same specialist task.

## Testing principles

Use representative test cases, review outputs rather than relying only on automated scores, and record issues without exposing private student content. AI-generated grades or feedback should be reviewed carefully and must follow the product's intended academic workflow.

Passing a test set does not guarantee that every response will be correct. Model capabilities and provider behaviour may change, so evaluation is ongoing.
