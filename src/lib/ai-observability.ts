type AiOutcome = "success" | "failure";

type AiMetric = {
  task: string;
  outcome: AiOutcome;
  startedAt: number;
  provider?: string;
  model?: string;
  statusCode?: number;
  timeToFirstTokenMs?: number | null;
};

/**
 * Emit privacy-conscious structured metrics to the hosting platform's runtime
 * logs. Never include prompts, completions, user IDs, filenames, or credentials.
 * Provider/model labels are optional and must be explicitly known by the caller.
 */
export function logAiMetric(metric: AiMetric) {
  const payload = {
    event: "studyspace_ai_request",
    task: metric.task,
    outcome: metric.outcome,
    durationMs: Math.max(0, Date.now() - metric.startedAt),
    ...(metric.provider ? { provider: metric.provider } : {}),
    ...(metric.model ? { model: metric.model } : {}),
    ...(typeof metric.statusCode === "number" ? { statusCode: metric.statusCode } : {}),
    ...(metric.timeToFirstTokenMs !== undefined ? { timeToFirstTokenMs: metric.timeToFirstTokenMs } : {}),
    timestamp: new Date().toISOString(),
  };
  if (metric.outcome === "failure") console.error(JSON.stringify(payload));
  else console.info(JSON.stringify(payload));
}
