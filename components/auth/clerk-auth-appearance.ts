/** مظهر Clerk — Cookie Bite، بطاقة دافئة وأزرار واضحة */
export const clerkAuthAppearance = {
  layout: {
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
    shimmer: true,
    showOptionalFields: true,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#c1692c",
    colorDanger: "#9b2c2c",
    colorSuccess: "#1e6f4e",
    colorWarning: "#b45309",
    colorText: "#3d2914",
    colorTextSecondary: "#6b5344",
    colorTextOnPrimaryBackground: "#ffffff",
    colorBackground: "#fffdf9",
    colorInputBackground: "#fdf9f3",
    colorInputText: "#2b1a0e",
    colorNeutral: "#8b7355",
    borderRadius: "0.875rem",
    spacingUnit: "0.9rem",
    fontSize: "0.9375rem",
    fontFamily: "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons:
      "var(--font-montserrat), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox:
      "mx-auto w-full !max-w-[26rem] min-w-0 box-border overflow-x-hidden motion-safe:transition-[opacity,transform] motion-safe:duration-300",
    card: [
      "!w-full !max-w-[26rem] min-w-0 mx-auto box-border",
      "rounded-[1.15rem] p-4 sm:p-5 gap-3.5 sm:gap-4",
      "bg-cb-surface/95 backdrop-blur-sm",
      "shadow-[0_12px_40px_-12px_rgba(91,58,36,0.18),0_4px_12px_-4px_rgba(91,58,36,0.08)]",
      "ring-1 ring-cb-peach-deep/70",
      "dark:bg-stone-900/90 dark:ring-stone-700/80 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)]",
      "max-h-none overflow-x-hidden overflow-y-visible",
      "motion-safe:transition-[box-shadow,ring-color] motion-safe:duration-300",
      "focus-within:ring-2 focus-within:ring-cb-brand-logo/30 focus-within:ring-offset-2 focus-within:ring-offset-cb-cream dark:focus-within:ring-offset-stone-950",
    ].join(" "),
    cardBox: "shadow-none",
    header: "!hidden",
    headerTitle: "!hidden",
    headerSubtitle: "!hidden",
    main: "min-w-0 w-full max-w-full gap-4 overflow-x-hidden",
    scrollBox: "min-w-0 w-full max-w-full overflow-x-hidden pb-0.5",
    logoBox: "!hidden",
    logoImage: "!hidden",
    socialButtonsRoot:
      "flex w-full min-w-0 max-w-full flex-col gap-2 [&>*]:min-w-0 [&>*]:max-w-full [&>*]:w-full",
    socialButtonsBlockButton: [
      "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-3",
      "rounded-xl border-2 border-cb-border/90 bg-gradient-to-b from-white to-cb-cream-2/90",
      "dark:from-stone-800 dark:to-stone-900 dark:border-stone-600",
      "text-sm h-[3.25rem] min-h-[3.25rem] font-semibold text-cb-text-strong",
      "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]",
      "transition-[background-color,transform,box-shadow,border-color] duration-200 ease-out",
      "hover:border-cb-brand-logo/40 hover:bg-cb-peach/40 hover:-translate-y-px hover:shadow-md",
      "active:translate-y-0 active:shadow-sm",
      "focus-visible:ring-2 focus-visible:ring-cb-brand-logo/35 focus-visible:ring-offset-2",
    ].join(" "),
    socialButtonsBlockButtonText: "font-semibold tracking-tight",
    socialButtonsIconButton: [
      "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-3",
      "rounded-xl border-2 border-cb-border bg-cb-cream-2/90 h-[3.25rem]",
      "transition-all duration-200 hover:bg-cb-peach/50 hover:-translate-y-px",
    ].join(" "),
    socialButtonsProviderIcon: "h-5 w-5 shrink-0",
    formButtonPrimary: [
      "w-full max-w-full rounded-xl",
      "bg-gradient-to-b from-cb-brand-logo to-[color-mix(in_oklab,var(--cb-brand-logo)_82%,#5c2e0e)]",
      "hover:from-[color-mix(in_oklab,var(--cb-brand-logo)_95%,#fff)] hover:to-cb-brand-logo",
      "text-base h-[3.25rem] min-h-[3.25rem] font-bold text-white",
      "shadow-[0_4px_14px_-4px_rgba(193,105,44,0.55)]",
      "transition-[transform,box-shadow,filter] duration-200 ease-out",
      "hover:-translate-y-px hover:shadow-[0_6px_18px_-4px_rgba(193,105,44,0.5)]",
      "active:translate-y-0 active:shadow-sm",
      "disabled:opacity-55 disabled:hover:translate-y-0 disabled:shadow-none",
      "focus-visible:ring-2 focus-visible:ring-cb-brand-logo/40 focus-visible:ring-offset-2",
    ].join(" "),
    formButtonReset:
      "text-sm font-semibold text-cb-terracotta-dark hover:underline underline-offset-4",
    formButtonSecondary: [
      "w-full max-w-full rounded-xl border-2 border-cb-border",
      "bg-cb-cream text-sm h-11 font-semibold text-cb-text-strong",
      "hover:bg-cb-peach/50 hover:border-cb-brand-logo/25",
      "transition-colors duration-200",
    ].join(" "),
    formFieldRow: "min-w-0 w-full max-w-full gap-2.5",
    formFieldInputGroup: "min-w-0 w-full max-w-full gap-1.5",
    formFieldInput: [
      "w-full max-w-full min-w-0 rounded-xl text-base h-[3.25rem] box-border",
      "border-2 border-cb-border/90 bg-cb-cream-2/95 px-3.5 text-cb-text-strong",
      "dark:bg-stone-800/90 dark:border-stone-600 dark:text-stone-50",
      "placeholder:text-cb-text-muted/75",
      "transition-[border-color,box-shadow,background-color] duration-200",
      "hover:border-cb-peach-deep/80",
      "focus:border-cb-brand-logo focus:bg-white dark:focus:bg-stone-800",
      "focus:shadow-[0_0_0_3px_rgba(193,105,44,0.2)]",
    ].join(" "),
    formFieldInputShowPasswordButton:
      "text-cb-terracotta-dark hover:bg-cb-peach/50 rounded-lg p-1.5 transition-colors duration-200",
    phoneInputBox:
      "w-full max-w-full min-w-0 [&_*]:min-w-0 [&_input]:min-w-0 [&_input]:h-[3.25rem]",
    formInputGroup: "w-full max-w-full min-w-0",
    formFieldLabel:
      "text-[11px] font-bold uppercase tracking-[0.06em] text-cb-text-strong",
    formFieldAction:
      "text-sm font-semibold text-cb-terracotta-dark hover:text-cb-brand-logo hover:underline underline-offset-4 transition-colors",
    formFieldErrorText:
      "text-xs font-medium text-red-900 bg-red-50 rounded-lg px-2.5 py-1.5 ring-1 ring-red-200/90 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-800/60",
    formFieldSuccessText: "text-xs font-medium text-emerald-800 dark:text-emerald-200",
    formFieldHintText: "text-xs text-cb-text-muted leading-snug",
    footerAction:
      "flex min-w-0 w-full max-w-full flex-wrap gap-x-1 gap-y-1 justify-center overflow-x-hidden text-center pt-1",
    footerActionText: "text-sm text-cb-text-muted",
    footerActionLink:
      "text-cb-brand-logo font-bold text-sm underline-offset-4 hover:underline",
    footer: "min-w-0 w-full max-w-full text-[11px] sm:text-xs text-cb-text-muted pt-2",
    footerPages: "text-[11px] text-cb-text-muted",
    identityPreview: "rounded-xl border border-cb-border bg-cb-cream-2/80 px-3 py-2",
    identityPreviewText: "text-sm text-cb-text-strong font-medium",
    identityPreviewEditButton:
      "text-cb-terracotta-dark font-semibold text-sm hover:underline",
    dividerRow: "w-full max-w-full py-2",
    dividerLine: "bg-gradient-to-r from-transparent via-cb-peach-deep/60 to-transparent h-px",
    dividerText:
      "text-cb-text-muted text-[10px] font-bold uppercase tracking-[0.12em] px-2",
    formResendCodeLink:
      "text-sm font-semibold text-cb-terracotta-dark hover:text-cb-brand-logo transition-colors",
    otpCodeFieldInput: [
      "w-full max-w-full rounded-xl h-12 text-lg font-semibold tracking-widest",
      "border-2 border-cb-border focus:border-cb-brand-logo",
      "focus:shadow-[0_0_0_3px_rgba(193,105,44,0.18)]",
    ].join(" "),
    alternativeMethodsBlock: "min-w-0 w-full max-w-full gap-2",
    alternativeMethodsBlockButton: [
      "w-full max-w-full text-sm rounded-xl border-2 border-cb-border h-11",
      "font-semibold text-cb-text-strong hover:bg-cb-peach/40 hover:border-cb-brand-logo/20",
      "transition-colors duration-200",
    ].join(" "),
    spinner: "text-cb-brand-logo",
    alertText:
      "text-sm text-red-900 bg-red-50/95 border border-red-200/90 rounded-xl px-3 py-2.5 dark:bg-red-950/50 dark:text-red-100 dark:border-red-800/50",
    formFieldWarningText: "text-xs text-amber-900 dark:text-amber-200",
    userPreviewMainIdentifier: "font-semibold text-cb-text-strong text-base",
    userPreviewSecondaryIdentifier: "text-cb-text-muted text-sm",
    passwordStrengthBar: "rounded-full overflow-hidden bg-cb-peach/50 h-1.5",
    passwordStrengthBarItem:
      "rounded-full bg-gradient-to-r from-amber-400 via-cb-brand-logo to-cb-terracotta-dark",
    backLink:
      "text-sm font-semibold text-cb-terracotta-dark hover:text-cb-brand-logo transition-colors",
    navbar: "hidden",
    navbarButton: "hidden",
    badge:
      "rounded-full bg-cb-peach/60 text-cb-text-strong text-[10px] font-bold uppercase tracking-wide px-2 py-0.5",
    selectButton:
      "rounded-xl border-2 border-cb-border h-11 font-semibold hover:bg-cb-peach/30 transition-colors",
  },
} as const;
