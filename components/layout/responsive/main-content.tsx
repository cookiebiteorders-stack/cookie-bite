"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.main
      id="main-content"
      className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="rounded-xl border border-cb-border bg-cb-surface p-4 sm:p-5">
        {pathname === "/" ? (
          <section className="mb-6 space-y-4 border-b border-cb-border pb-6">
            <p className="text-xs text-cb-text-muted">Home / Dashboard</p>
            <h1 className="font-layout-heading text-2xl font-semibold text-cb-text-strong">
              Responsive Control Center
            </h1>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {["Revenue", "Orders", "Customers"].map((k) => (
                <article key={k} className="rounded-lg border border-cb-border bg-cb-cream p-4">
                  <p className="text-sm text-cb-text-muted">{k}</p>
                  <p className="mt-2 text-xl font-bold text-cb-text-strong">+12.4%</p>
                </article>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-cb-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cb-cream text-cb-text-muted">
                  <tr>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Website Refresh", "Mina", "In Progress"],
                    ["SEO Sprint", "Team Growth", "Review"],
                    ["Checkout Revamp", "Payments", "Done"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-cb-border">
                      <td className="px-3 py-2">{row[0]}</td>
                      <td className="px-3 py-2">{row[1]}</td>
                      <td className="px-3 py-2">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {children}
      </div>
    </motion.main>
  );
}

