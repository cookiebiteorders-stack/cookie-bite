import type { Metadata } from "next";
import { SIGN_IN_TITLE } from "@/lib/auth/clerk-auth-localization";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: SIGN_IN_TITLE,
  description: "Sign in to cookie-bite.com to track orders and manage your account.",
  path: "/sign-in",
  keywords: ["cookie bite login", "customer sign in"],
  noIndex: true,
});

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
