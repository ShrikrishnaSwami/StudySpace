export type AiGradeCriterion = { name: string; score: number; maxScore: number; comment: string };

export type ValidatedAiGrade = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  criteria: AiGradeCriterion[];
  confidence: number;
  uncertainty: string;
};

/** Validate model output before any AI grade is persisted to a student record. */
export function validateAiGradingResult(value: unknown, maxPoints: number, hasExplicitRubric: boolean): ValidatedAiGrade {
  if (!value || typeof value !== "object" || !Number.isFinite(maxPoints) || maxPoints <= 0) {
    throw new Error("AI returned an invalid grade. Please retry.");
  }
  const result = value as Record<string, unknown>;
  const score = result.score;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > maxPoints ||
    typeof result.feedback !== "string" || !result.feedback.trim()) {
    throw new Error("AI returned an invalid grade. Please retry.");
  }
  if (!Array.isArray(result.criteria)) throw new Error("AI returned an incomplete rubric breakdown. Please retry.");
  const criteria: AiGradeCriterion[] = [];
  const seenNames = new Set<string>();
  for (const item of result.criteria) {
    if (!item || typeof item !== "object") throw new Error("AI returned an incomplete rubric breakdown. Please retry.");
    const criterion = item as Record<string, unknown>;
    const name = typeof criterion.name === "string" ? criterion.name.trim() : "";
    const comment = typeof criterion.comment === "string" ? criterion.comment.trim() : "";
    const points = criterion.score;
    const maximum = criterion.maxScore;
    if (!name || !comment || typeof points !== "number" || !Number.isFinite(points) || points < 0 ||
      typeof maximum !== "number" || !Number.isFinite(maximum) || maximum <= 0 || points > maximum ||
      seenNames.has(name.toLocaleLowerCase())) {
      throw new Error("AI returned an incomplete rubric breakdown. Please retry.");
    }
    seenNames.add(name.toLocaleLowerCase());
    criteria.push({ name, score: points, maxScore: maximum, comment });
  }
  if (hasExplicitRubric && criteria.length === 0) {
    throw new Error("The AI could not evaluate the supplied rubric criterion by criterion. Please retry.");
  }
  const criteriaMaximum = criteria.reduce((sum, item) => sum + item.maxScore, 0);
  const criteriaScore = criteria.reduce((sum, item) => sum + item.score, 0);
  if (criteria.length && Math.abs(criteriaMaximum - maxPoints) < 0.01 && Math.abs(criteriaScore - score) > 0.51) {
    throw new Error("The rubric breakdown does not reconcile with the overall grade. Please retry.");
  }
  if (typeof result.confidence !== "number" || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1 ||
    typeof result.uncertainty !== "string" || !result.uncertainty.trim()) {
    throw new Error("AI returned incomplete confidence or uncertainty information. Please retry.");
  }
  const toStringList = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
  return {
    score,
    feedback: result.feedback.trim(),
    strengths: toStringList(result.strengths),
    improvements: toStringList(result.improvements),
    criteria,
    confidence: result.confidence,
    uncertainty: result.uncertainty.trim().slice(0, 1200),
  };
}
