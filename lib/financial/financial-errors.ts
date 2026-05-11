export type FinancialErrorSeverity = "low" | "medium" | "critical";

export type FriendlyFinancialError = {
  title: string;
  description: string;
  severity: FinancialErrorSeverity;
  technical?: string;
};

export function parseFinancialError(raw: string): FriendlyFinancialError {
  const m = raw.toLowerCase();
  if (m.includes("relation") && m.includes("does not exist")) {
    return {
      title: "We couldn't load your financial data",
      description:
        "A required database table is missing. Run the latest Supabase migrations or contact your platform admin.",
      severity: "critical",
      technical: raw,
    };
  }
  if (m.includes("column") && m.includes("does not exist")) {
    return {
      title: "We couldn't load your financial data",
      description:
        "The database schema is out of date. Apply pending migrations, then try again.",
      severity: "medium",
      technical: raw,
    };
  }
  if (m.includes("jwt") || m.includes("unauthorized") || m.includes("401")) {
    return {
      title: "Session expired",
      description: "Please sign in again to access financial reports.",
      severity: "critical",
      technical: raw,
    };
  }
  return {
    title: "We couldn't load your financial data",
    description:
      "This might be due to a server delay or connection issue. Retry in a few seconds or check server logs.",
    severity: "medium",
    technical: raw,
  };
}
