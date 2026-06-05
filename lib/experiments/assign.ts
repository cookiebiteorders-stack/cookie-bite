import { trackGa4Event } from "@/lib/analytics/ga4";
import { EXPERIMENTS, type ExperimentId } from "@/lib/experiments/config";

const STORAGE_PREFIX = "cb_exp_";

function pickWeighted(variants: readonly string[], weights?: readonly number[]): string {
  if (!weights?.length || weights.length !== variants.length) {
    return variants[Math.floor(Math.random() * variants.length)];
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < variants.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return variants[i];
  }
  return variants[variants.length - 1];
}

/** يعيّن variant ثابتاً لكل زائر (localStorage) ويُبلّغ GA4 مرة واحدة. */
export function assignExperimentVariant(experimentId: ExperimentId): string {
  const def = EXPERIMENTS[experimentId];
  if (!def) return "control";

  if (typeof window === "undefined") return def.variants[0];

  const key = `${STORAGE_PREFIX}${experimentId}`;
  const existing = localStorage.getItem(key);
  if (existing && def.variants.includes(existing)) return existing;

  const variant = pickWeighted(def.variants, def.weights);
  localStorage.setItem(key, variant);

  const exposedKey = `${key}_exposed`;
  if (!sessionStorage.getItem(exposedKey)) {
    sessionStorage.setItem(exposedKey, "1");
    trackGa4Event("experiment_exposure", {
      experiment_id: experimentId,
      variant,
    });
  }

  return variant;
}
