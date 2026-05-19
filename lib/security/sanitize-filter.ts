/**
 * Sanitizers for Supabase PostgREST filter strings.
 *
 * PostgREST's `.or()` builder accepts a free-form string like
 * `col.ilike.%foo%,col2.ilike.%foo%`. Values inside that string are NOT
 * parameterized, so any comma, percent sign, parenthesis, or backslash from
 * untrusted input can break the filter, leak data across columns, or
 * inject extra clauses (a form of NoSQL/PostgREST injection).
 *
 * Always pass user input through `sanitizePostgrestLike` before embedding it
 * into a `.or()` / `.ilike()` template.
 */

/**
 * Removes characters that have special meaning in a PostgREST filter expression
 * and caps the length to a sane upper bound. Returns a value safe to interpolate
 * inside a `col.ilike.%${value}%` template.
 */
export function sanitizePostgrestLike(input: string, maxLength = 80): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().slice(0, maxLength);
  return trimmed
    // PostgREST splits clauses on commas — strip them.
    .replace(/,/g, " ")
    // Parentheses delimit groups in `.or(... )` — strip them.
    .replace(/[()]/g, " ")
    // LIKE wildcards & escape char from the user side — we control them ourselves.
    .replace(/[%_\\]/g, " ")
    // Control / quote characters that may confuse the URL encoder.
    .replace(/["'`;]/g, " ")
    // Collapse whitespace so the resulting filter stays compact.
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds a safe PostgREST `or` clause for a fuzzy search across multiple
 * columns. The same sanitized value is reused for every column.
 *
 * @example
 *   const orClause = buildIlikeOrClause(["name", "sku"], "foo,bar");
 *   // => "name.ilike.%foo bar%,sku.ilike.%foo bar%"
 *   supabase.from("products").select("*").or(orClause);
 */
export function buildIlikeOrClause(columns: string[], rawValue: string): string {
  const value = sanitizePostgrestLike(rawValue);
  if (!value) return "";
  return columns.map((col) => `${col}.ilike.%${value}%`).join(",");
}
