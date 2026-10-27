# Running StudySpace with a local AI model

StudySpace now has a provider-independent AI gateway. The AI Tutor can use the existing managed model configuration or send prompts to an Ollama model that runs on hardware you control.

## What this gives us

- A model gateway that keeps StudySpace features independent of one vendor.
- Local inference through Ollama's chat API.
- The same StudySpace course context and tutoring instructions passed to the selected model.
- Clear errors when Ollama is offline or the requested model is missing.

This is local model inference, not training a new foundation model from scratch. It is the first step toward controlling the model runtime and later experimenting with fine-tuning.

## 1. Install Ollama

Install Ollama from https://ollama.com for the computer that will run the model.

Open a terminal and download a model:

```bash
ollama pull qwen2.5:7b
```

For computers with less memory, try a smaller model such as `qwen2.5:3b` and set `STUDYSPACE_LOCAL_MODEL=qwen2.5:3b`.

Check that Ollama is responding:

```bash
ollama list
```

Ollama normally listens on `http://127.0.0.1:11434`.

## 2. Configure StudySpace

Add these variables to the local `.env.local` file:

```dotenv
STUDYSPACE_AI_PROVIDER=ollama
STUDYSPACE_LOCAL_URL=http://127.0.0.1:11434
STUDYSPACE_LOCAL_MODEL=qwen2.5:7b
```

Restart the Next.js development server after changing environment variables.

Keep the existing Supabase and AI usage environment variables configured. The current tutor route still authenticates the student, loads their StudySpace context, and applies the existing AI quota checks before generation.

## 3. Local development versus deployment

The default local URL only works when the Next.js server and Ollama can reach each other on the same machine. A hosted deployment such as Vercel cannot reach your personal computer's `127.0.0.1`.

For a hosted deployment, run Ollama on a private server reachable by the application and set `STUDYSPACE_LOCAL_URL` to that server's internal or protected endpoint. Do not expose Ollama's port publicly without network access controls. Do not put model-server credentials in client-side variables.

If the local model is unavailable, the request returns a helpful error rather than silently switching to a different provider.

## 4. Model development roadmap

1. Establish a reliable local inference path and compare responses against a small tutoring test set.
2. Add retrieval over course notes and uploaded study material with source references.
3. Measure factuality, step correctness, refusal behavior, latency, and memory use.
4. Build a curated set of educational examples and evaluate fine-tuning only when there is a measurable gap.
5. Consider fine-tuning an open-weight model; do not expect a small fine-tune to recreate the capabilities of a frontier model.

## Security notes

- Model calls stay on the server side.
- The existing authenticated tutor endpoint and quota enforcement remain in place.
- Treat course notes, uploaded documents, and student messages as untrusted input.
- Do not commit API keys, private model URLs, or other secrets.
