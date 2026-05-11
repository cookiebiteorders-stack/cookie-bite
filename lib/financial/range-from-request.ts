import {
  endOfDay,
  endOfMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMilliseconds,
} from "date-fns";
import type { FinancialPreset } from "@/lib/financial/types";

export type ParsedRange = {
  preset: FinancialPreset;
  from: Date;
  to: Date;
};

export function parseFinancialRange(searchParams: URLSearchParams): ParsedRange {
  const preset = (searchParams.get("preset") ?? "month") as FinancialPreset;
  const now = new Date();
  const fromQ = searchParams.get("from");
  const toQ = searchParams.get("to");

  if (preset === "custom") {
    if (fromQ && toQ) {
      return {
        preset: "custom",
        from: startOfDay(parseISO(fromQ)),
        to: endOfDay(parseISO(toQ)),
      };
    }
    return {
      preset: "month",
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }

  if (preset === "today") {
    return { preset: "today", from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === "week") {
    return { preset: "week", from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }

  if (preset === "month") {
    return {
      preset: "month",
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }

  return {
    preset: "month",
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

export function previousPeriod(from: Date, to: Date): { from: Date; to: Date; label: string } {
  const durationMs = endOfDay(to).getTime() - startOfDay(from).getTime();
  const prevTo = subMilliseconds(startOfDay(from), 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return {
    from: startOfDay(prevFrom),
    to: endOfDay(prevTo),
    label: "Previous period",
  };
}
