import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Create Account",
  description:
    "Create your Cookie Bite account to save addresses, track orders, and redeem loyalty rewards.",
  path: "/sign-up",
  keywords: ["cookie bite sign up", "create customer account"],
  noIndex: true,
});

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
