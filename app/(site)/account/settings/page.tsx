import { UserProfile } from "@clerk/nextjs";
import { PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Manage Account | Cookie Bite",
};

export default function AccountSettingsPage() {
  return (
    <PageShell className="pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-4 w-full">
        <h1 className="mb-8 font-serif text-3xl font-bold tracking-tight text-cb-text-strong md:text-4xl">
          Profile Settings
        </h1>
        <div className="flex justify-center w-full">
          <UserProfile
            path="/account/settings"
            routing="path"
            appearance={{
              elements: {
                rootBox: "w-full shadow-md ring-1 ring-cb-border rounded-2xl",
                card: "shadow-none bg-cb-surface rounded-2xl w-full max-w-full",
                navbar: "bg-cb-cream",
                navbarButton: "text-cb-text data-[active=true]:text-cb-terracotta-dark",
                profileSectionTitle: "font-serif text-cb-text-strong",
              },
            }}
          />
        </div>
      </div>
    </PageShell>
  );
}
