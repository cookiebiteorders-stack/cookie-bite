/**
 * مظهر UserProfile — عرض كامل داخل /account/settings (مستقل عن بطاقة Sign-in الضيقة).
 */
export const clerkProfileAppearance = {
  variables: {
    colorPrimary: "#c1692c",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorText: "#2d1810",
    colorTextSecondary: "#5c3d2e",
    colorBackground: "#fffaf4",
    colorInputBackground: "#fff8f0",
    colorInputText: "#2d1810",
    borderRadius: "0.875rem",
    fontFamily: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "cb-clerk-profile__root w-full max-w-none min-w-0",
    cardBox: "cb-clerk-profile__card-box w-full max-w-none shadow-none",
    card: [
      "cb-clerk-profile__card w-full max-w-none min-w-0",
      "rounded-2xl border-0 bg-transparent shadow-none",
      "overflow-visible",
    ].join(" "),
    navbar: [
      "cb-clerk-profile__navbar",
      "flex w-full shrink-0 flex-col gap-1",
      "rounded-2xl bg-cb-cream/90 p-2 ring-1 ring-cb-border/70",
      "lg:w-52 lg:min-w-[12rem]",
      "dark:bg-cb-surface-2/90",
    ].join(" "),
    navbarButton: [
      "cb-clerk-profile__nav-btn w-full justify-start rounded-xl px-3 py-2.5",
      "text-sm font-semibold text-cb-text-strong",
      "hover:bg-cb-peach/45",
      "data-[active=true]:bg-cb-terracotta-dark data-[active=true]:text-white",
      "data-[active=true]:shadow-sm",
    ].join(" "),
    navbarButtonIcon: "text-cb-terracotta-dark data-[active=true]:text-white",
    navbarMobileMenuRow: "hidden",
    navbarMobileMenuButton: "hidden",
    pageScrollBox: [
      "cb-clerk-profile__scroll",
      "min-h-[20rem] w-full min-w-0 flex-1",
      "overflow-x-hidden overflow-y-auto",
      "pe-1",
    ].join(" "),
    page: "cb-clerk-profile__page w-full min-w-0 flex-1",
    profilePage: [
      "cb-clerk-profile__profile-page",
      "flex w-full min-w-0 flex-col gap-6",
      "lg:flex-row lg:items-start",
    ].join(" "),
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    profileSection: "w-full min-w-0 space-y-4",
    profileSectionTitle: "font-serif text-base font-semibold text-cb-text-strong mb-3",
    profileSectionTitleText: "font-serif text-base font-semibold text-cb-text-strong",
    profileSectionContent: "w-full min-w-0 space-y-3",
    profileSectionPrimaryButton:
      "rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white hover:bg-cb-brand-logo",
    accordionTriggerButton:
      "rounded-xl border border-cb-border bg-cb-cream/80 px-3 py-2 text-sm font-semibold hover:bg-cb-peach/40",
    formFieldInput: [
      "w-full min-w-0 rounded-xl border-2 border-cb-border bg-cb-cream-2/95",
      "h-11 px-3 text-sm text-cb-text-strong",
      "focus:border-cb-brand-logo focus:ring-2 focus:ring-cb-brand-logo/20",
    ].join(" "),
    formFieldLabel: "text-xs font-bold uppercase tracking-wide text-cb-text-muted",
    formButtonPrimary:
      "rounded-xl bg-cb-terracotta-dark px-4 py-2.5 text-sm font-bold text-white hover:bg-cb-brand-logo",
    formButtonReset: "text-sm font-semibold text-cb-terracotta-dark hover:underline",
    badge: "rounded-full bg-cb-peach/60 text-[10px] font-bold uppercase text-cb-text-strong",
    footer: "hidden",
    scrollBox: "w-full min-w-0",
  },
} as const;
