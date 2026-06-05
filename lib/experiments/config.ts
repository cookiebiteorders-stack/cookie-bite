export type ExperimentId = "pdp_fbt_placement";

export type ExperimentDefinition = {
  variants: readonly string[];
  /** نسبة كل variant — يجب أن يجمع = 1 */
  weights?: readonly number[];
};

export const EXPERIMENTS: Record<ExperimentId, ExperimentDefinition> = {
  pdp_fbt_placement: {
    variants: ["above_reviews", "below_reviews"],
    weights: [0.5, 0.5],
  },
};
