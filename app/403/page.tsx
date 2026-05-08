import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cb-terracotta-dark">403</p>
      <h1 className="mt-3 font-serif text-4xl font-bold text-cb-text-strong">Access forbidden</h1>
      <p className="mt-3 text-cb-text">
        You do not currently have permission to access this area.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-cb-terracotta-dark px-6 py-3 text-sm font-semibold text-white"
      >
        Back to homepage
      </Link>
    </main>
  );
}

