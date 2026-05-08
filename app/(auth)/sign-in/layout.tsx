import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In",
  description: "Sign in to your Cookie Bite account to track orders and manage your dashboard.",
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
