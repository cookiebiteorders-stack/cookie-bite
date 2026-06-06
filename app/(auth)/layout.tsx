import "@/app/styles/route-auth.css";
import { ClerkHideDevFooter } from "@/components/auth/clerk-hide-dev-footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-auth"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cb-brand-600 focus:px-3 focus:py-2 focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-cb-brand-300"
      >
        Skip to sign-in form
      </a>
      <main id="main-auth" className="min-h-screen">
        <ClerkHideDevFooter />
        {children}
      </main>
    </>
  );
}
