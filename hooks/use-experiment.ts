"use client";

import { useState } from "react";
import { assignExperimentVariant } from "@/lib/experiments/assign";
import type { ExperimentId } from "@/lib/experiments/config";

export function useExperiment(experimentId: ExperimentId): string {
  const [variant] = useState(() => assignExperimentVariant(experimentId));
  return variant;
}
