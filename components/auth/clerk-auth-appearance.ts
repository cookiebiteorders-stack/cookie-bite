/** مظهر Clerk — Cookie Bite، mobile-first وتباين قوي */
export const clerkAuthAppearance = {
  layout: {
    socialButtonsVariant: "blockButton" as const,
    shimmer: false,
    /** إخفاء شريط «Development mode» في التطوير — يقلّل كسر التخطيط والتمرير الأفقي */
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#c1692c",
    colorDanger: "#9b2c2c",
    colorSuccess: "#1e6f4e",
    colorText: "#5c3d1e",
    colorTextSecondary: "#6b5344",
    colorBackground: "#ffffff",
    colorInputBackground: "#fdf9f3",
    colorInputText: "#2b1a0e",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons:
      "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox:
      "mx-auto w-full !max-w-[28rem] min-w-0 box-border overflow-x-hidden motion-safe:transition-[opacity,transform] motion-safe:duration-300",
    card: [
      "shadow-[0_8px_32px_-8px_rgba(91,58,36,0.12)] ring-1 ring-cb-peach-deep/80 bg-cb-surface dark:bg-transparent dark:ring-cb-border/60",
      "!w-full !max-w-[28rem] min-w-0 mx-auto",
      "rounded-2xl p-4 sm:p-5 box-border gap-3 sm:gap-4",
      "max-h-none overflow-x-hidden overflow-y-visible overscroll-x-none",
      "motion-safe:transition-[box-shadow,ring-color] motion-safe:duration-300",
      "focus-within:ring-2 focus-within:ring-cb-brand-logo/25 focus-within:ring-offset-2 focus-within:ring-offset-cb-cream dark:focus-within:ring-offset-transparent",
    ].join(" "),
    header: "space-y-1.5",
    headerTitle:
      "font-serif text-2xl font-semibold text-cb-text-strong tracking-tight sm:text-[1.75rem]",
    headerSubtitle:
      "text-sm leading-relaxed text-cb-text-muted sm:text-[0.9375rem]",
    main: "min-w-0 w-full max-w-full gap-4 overflow-x-hidden",
    scrollBox: "min-w-0 w-full max-w-full overflow-x-hidden",
    socialButtonsRoot:
      "flex w-full min-w-0 max-w-full flex-col gap-2.5 [&>*]:min-w-0 [&>*]:max-w-full [&>*]:w-full",
    socialButtonsBlockButton: [
      "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-3",
      "rounded-xl border-2 border-cb-border bg-cb-cream-2/80",
      "text-sm h-12 min-h-12 font-semibold text-cb-text-strong",
      "transition-[background-color,transform,box-shadow] duration-200 ease-out",
      "hover:bg-cb-peach/50 hover:-translate-y-px hover:shadow-sm",
      "active:translate-y-0",
    ].join(" "),
    socialButtonsIconButton: [
      "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-3",
      "rounded-xl border-2 border-cb-border bg-cb-cream-2/80",
      "text-sm h-12 min-h-12 font-semibold text-cb-text-strong",
      "transition-[background-color,transform,box-shadow] duration-200 ease-out",
      "hover:bg-cb-peach/50 hover:-translate-y-px hover:shadow-sm",
      "active:translate-y-0",
    ].join(" "),
    formButtonPrimary: [
      "w-full max-w-full rounded-xl bg-cb-brand-logo hover:bg-[color-mix(in_oklab,var(--cb-brand-logo)_88%,#000)]",
      "text-base h-12 min-h-12 font-bold text-white shadow-sm",
      "transition-[background-color,transform,box-shadow] duration-200 ease-out",
      "hover:-translate-y-px hover:shadow-md",
      "active:translate-y-0",
      "disabled:opacity-60 disabled:hover:translate-y-0",
    ].join(" "),
    formButtonSecondary:
      "w-full max-w-full rounded-xl border-2 border-cb-border bg-cb-cream text-sm h-11 font-semibold text-cb-text-strong hover:bg-cb-peach/60",
    formFieldRow: "min-w-0 w-full max-w-full gap-2.5",
    formFieldInputGroup: "min-w-0 w-full max-w-full gap-1.5",
    formFieldInput: [
      "w-full max-w-full min-w-0 rounded-xl text-base h-12 box-border",
      "border-2 border-cb-border bg-cb-cream-2/90 px-3.5 text-cb-text-strong dark:bg-cb-surface-2 dark:border-cb-border",
      "placeholder:text-cb-text-muted/80",
      "transition-[border-color,box-shadow] duration-200",
      "focus:border-cb-brand-logo focus:shadow-[0_0_0_3px_rgba(193,105,44,0.18)]",
    ].join(" "),
    formFieldInputShowPasswordButton:
      "text-cb-terracotta-dark hover:bg-cb-peach/40 rounded-lg transition-colors duration-200",
    phoneInputBox:
      "w-full max-w-full min-w-0 [&_*]:min-w-0 [&_input]:min-w-0",
    formInputGroup: "w-full max-w-full min-w-0",
    formFieldLabel: "text-xs font-bold uppercase tracking-wide text-cb-text-strong",
    formFieldAction: "text-sm font-semibold text-cb-terracotta-dark hover:underline",
    formFieldErrorText:
      "text-xs font-medium text-red-800 bg-red-50/90 rounded-lg px-2 py-1.5 ring-1 ring-red-200/80",
    formFieldSuccessText: "text-xs font-medium text-emerald-800",
    formFieldHintText: "text-xs text-cb-text-muted leading-snug",
    footerAction:
      "flex min-w-0 w-full max-w-full flex-wrap gap-x-1 gap-y-1 justify-center overflow-x-hidden text-center",
    footerActionLink:
      "text-cb-terracotta-dark font-bold text-sm underline-offset-4 hover:underline",
    footer: "min-w-0 w-full max-w-full text-xs sm:text-sm text-cb-text-muted",
    footerPages: "text-xs text-cb-text-muted",
    identityPreviewText: "text-sm text-cb-text",
    identityPreviewEditButton:
      "text-cb-terracotta-dark font-semibold text-sm hover:underline",
    dividerRow: "w-full max-w-full py-1",
    dividerLine: "bg-cb-peach-deep/50",
    dividerText: "text-cb-text-muted text-xs font-medium uppercase tracking-wider",
    formResendCodeLink: "text-sm font-semibold text-cb-terracotta-dark",
    otpCodeFieldInput: "w-full max-w-full rounded-xl",
    alternativeMethodsBlock: "min-w-0 w-full max-w-full",
    alternativeMethodsBlockButton:
      "w-full max-w-full text-sm rounded-xl border border-cb-border h-10 hover:bg-cb-peach/40",
    spinner: "text-cb-terracotta-dark",
    alertText:
      "text-sm text-red-900 bg-red-50 border border-red-200 rounded-xl px-3 py-2",
    formFieldWarningText: "text-xs text-amber-900",
    userPreviewMainIdentifier: "font-semibold text-cb-text-strong",
    userPreviewSecondaryIdentifier: "text-cb-text-muted text-sm",
    /** شريط قوة كلمة المرور (عند تفعيله من لوحة Clerk) */
    passwordStrengthBar: "rounded-full overflow-hidden bg-cb-peach/60",
    passwordStrengthBarItem:
      "rounded-full bg-gradient-to-r from-cb-terracotta-soft to-cb-terracotta-dark",
  },
} as const;

