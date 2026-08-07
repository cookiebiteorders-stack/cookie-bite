"use client";

import { useState, useEffect } from "react";

export default function CheckoutPageClient() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch("/api/csrf");
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.token);
        } else {
          setCsrfToken("fallback-" + Date.now().toString(36));
        }
      } catch (err) {
        setCsrfToken("fallback-" + Date.now().toString(36));
      }
    };
    fetchCsrfToken();
  }, []);

  return (
    <div>
      <h1>Checkout</h1>
      <p>CSRF Token: {csrfToken || "Loading..."}</p>
    </div>
  );
}
