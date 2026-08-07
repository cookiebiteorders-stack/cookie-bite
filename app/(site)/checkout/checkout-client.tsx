"use client";

import { createContext, useContext } from "react";

const CsrfTokenContext = createContext<string | null>(null);

export function useCsrfToken() {
  return useContext(CsrfTokenContext);
}

export default function CheckoutClient({
  csrfToken,
  children,
}: {
  csrfToken: string;
  children: React.ReactNode;
}) {
  return (
    <CsrfTokenContext.Provider value={csrfToken}>
      {children}
    </CsrfTokenContext.Provider>
  );
}
