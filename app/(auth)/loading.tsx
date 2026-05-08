export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cb-cream px-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-cb-peach-deep border-t-cb-terracotta-dark"
        aria-hidden
      />
      <p className="text-sm font-medium text-cb-text-muted">Loading…</p>
      <span className="sr-only">Loading authentication</span>
    </div>
  );
}
