/**
 * StudySpace monetization foundation.
 *
 * Monetization is intentionally disabled: this module adds no billing UI,
 * checkout, payment processing, or public pricing. When you're ready, wire a
 * server-verified billing provider into entitlement checks and then enable the
 * feature flag. Never use a client-only flag as authorization for paid access.
 */
export const MONETIZATION_ENABLED = false;

export type StudySpacePlan = "free" | "plus" | "educator";
export type StudySpaceEntitlement =
  | "ai_tutor"
  | "quiz_generation"
  | "flashcard_generation"
  | "homework_analysis"
  | "advanced_analytics"
  | "instructor_tools";

export const STUDYSPACE_PLAN_DEFAULTS = {
  free: {
    monthlyPriceCad: 0,
    dailyAiRequests: 10,
    entitlements: [
      "ai_tutor",
      "quiz_generation",
      "flashcard_generation",
      "homework_analysis",
    ],
  },
  plus: {
    monthlyPriceCad: 9.99,
    dailyAiRequests: 100,
    entitlements: [
      "ai_tutor",
      "quiz_generation",
      "flashcard_generation",
      "homework_analysis",
      "advanced_analytics",
    ],
  },
  educator: {
    monthlyPriceCad: null,
    dailyAiRequests: 250,
    entitlements: [
      "ai_tutor",
      "quiz_generation",
      "flashcard_generation",
      "homework_analysis",
      "advanced_analytics",
      "instructor_tools",
    ],
  },
} as const satisfies Record<
  StudySpacePlan,
  {
    monthlyPriceCad: number | null;
    dailyAiRequests: number;
    entitlements: readonly StudySpaceEntitlement[];
  }
>;

/**
 * A pure helper for future server-side enforcement after a trusted billing
 * source has established the user's plan. It does not read client input or
 * establish that a user has paid.
 */
export function planIncludesEntitlement(
  plan: StudySpacePlan,
  entitlement: StudySpaceEntitlement,
): boolean {
  return (
    STUDYSPACE_PLAN_DEFAULTS[plan].entitlements as readonly string[]
  ).includes(entitlement);
}
