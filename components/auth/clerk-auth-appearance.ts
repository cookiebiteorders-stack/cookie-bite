import { CLERK_BRAND_VARIABLES } from "@/lib/auth/clerk-brand-appearance";

/** مظهر Clerk — Cookie Bite، متزامن مع tokens.css */
export const clerkAuthAppearance = {
  layout: {
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
    shimmer: true,
    showOptionalFields: true,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    ...CLERK_BRAND_VARIABLES,
  },
  elements: {
    rootBox:
      "mx-auto w-full !max-w-[26rem] min-w-0 box-border overflow-x-hidden motion-safe:transition-[opacity,transform] motion-safe:duration-300",
    card: [
      "!w-full !max-w-[26rem] min-w-0 mx-auto box-border",
      "rounded-[1.15rem] p-4 sm:p-5 gap-3.5 sm:gap-4",
      "bg-cb-surface/98 backdrop-blur-sm",
      "shadow-[0_12px_40px_-12px_rgba(249,115,22,0.18),0_4px_12px_-4px_rgba(249,115,22,0.08)]",
      "ring-1 ring-cb-border/90",
      "dark:bg-cb-surface/95 dark:ring-cb-border dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]",
      "max-h-none overflow-x-hidden overflow-y-visible",
      "motion-safe:transition-[box-shadow,ring-color] motion-safe:duration-300",
      "focus-within:ring-2 focus-within:ring-cb-brand-500/35 focus-within:ring-offset-2 focus-within:ring-offset-cb-cream dark:focus-within:ring-offset-cb-cream",
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
      "rounded-xl border-2 border-cb-border bg-gradient-to-b from-cb-surface to-cb-cream-2/95",
      "dark:from-cb-surface-elevated dark:to-cb-surface-2 dark:border-cb-border",
      "text-sm h-[3.25rem] min-h-[3.25rem] font-semibold text-cb-text-strong",
      "shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]",
      "transition-[background-color,transform,box-shadow,border-color] duration-200 ease-out",
      "hover:border-cb-brand-400/50 hover:bg-cb-brand-50 hover:-translate-y-px hover:shadow-md",
      "active:translate-y-0 active:shadow-sm",
      "focus-visible:ring-2 focus-visible:ring-cb-brand-500/35 focus-visible:ring-offset-2",
    ].join(" "),
    socialButtonsBlockButtonText: "font-semibold tracking-tight",
    socialButtonsIconButton: [
      "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-3",
      "rounded-xl border-2 border-cb-border bg-cb-cream-2/90 h-[3.25rem]",
      "transition-all duration-200 hover:bg-cb-brand-50 hover:-translate-y-px",
    ].join(" "),
    socialButtonsProviderIcon: "h-5 w-5 shrink-0",
    formButtonPrimary: [
      "w-full max-w-full rounded-xl",
      "bg-gradient-to-b from-cb-brand-500 to-cb-brand-600",
      "hover:from-cb-brand-400 hover:to-cb-brand-500",
      "text-base h-[3.25rem] min-h-[3.25rem] font-bold text-white",
      "shadow-[0_4px_14px_-4px_rgba(249,115,22,0.45)]",
      "transition-[transform,box-shadow,filter] duration-200 ease-out",
      "hover:-translate-y-px hover:shadow-[0_6px_18px_-4px_rgba(249,115,22,0.4)]",
      "active:translate-y-0 active:shadow-sm",
      "disabled:opacity-55 disabled:hover:translate-y-0 disabled:shadow-none",
      "focus-visible:ring-2 focus-visible:ring-cb-brand-500/40 focus-visible:ring-offset-2",
    ].join(" "),
    formButtonReset:
      "text-sm font-semibold text-cb-brand-700 hover:underline underline-offset-4 dark:text-cb-brand-300",
    formButtonSecondary: [
      "w-full max-w-full rounded-xl border-2 border-cb-border",
      "bg-cb-cream text-sm h-11 font-semibold text-cb-text-strong",
      "hover:bg-cb-brand-50 hover:border-cb-brand-300/60",
      "dark:bg-cb-surface-2 dark:hover:bg-cb-peach/40",
      "transition-colors duration-200",
    ].join(" "),
    formFieldRow: "min-w-0 w-full max-w-full gap-2.5",
    formFieldInputGroup: "min-w-0 w-full max-w-full gap-1.5",
    formFieldInput: [
      "w-full max-w-full min-w-0 rounded-xl text-base h-[3.25rem] box-border",
      "border-2 border-cb-border/90 bg-cb-cream-2/95 px-3.5 text-cb-text-strong",
      "dark:bg-cb-surface-2/95 dark:border-cb-border dark:text-cb-text-strong",
      "placeholder:text-cb-text-placeholder",
      "transition-[border-color,box-shadow,background-color] duration-200",
      "hover:border-cb-brand-200",
      "focus:border-cb-brand-500 focus:bg-cb-surface dark:focus:bg-cb-surface-elevated",
      "focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cb-brand-500)_22%,transparent)]",
    ].join(" "),
    formFieldInputShowPasswordButton:
      "text-cb-brand-700 hover:bg-cb-brand-50 rounded-lg p-1.5 transition-colors duration-200 dark:text-cb-brand-300",
    phoneInputBox:
      "w-full max-w-full min-w-0 [&_*]:min-w-0 [&_input]:min-w-0 [&_input]:h-[3.25rem]",
    formInputGroup: "w-full max-w-full min-w-0",
    formFieldLabel:
      "text-[11px] font-bold uppercase tracking-[0.06em] text-cb-text-strong",
    formFieldAction:
      "text-sm font-semibold text-cb-brand-700 hover:text-cb-brand-500 hover:underline underline-offset-4 transition-colors dark:text-cb-brand-300",
    formFieldErrorText:
      "text-xs font-medium text-red-900 bg-cb-danger-bg rounded-lg px-2.5 py-1.5 ring-1 ring-red-200/90 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-800/60",
    formFieldSuccessText:
      "text-xs font-medium text-emerald-800 dark:text-emerald-200",
    formFieldHintText: "text-xs text-cb-text-muted leading-snug",
    footerAction:
      "flex min-w-0 w-full max-w-full flex-wrap gap-x-1 gap-y-1 justify-center overflow-x-hidden text-center pt-1",
    footerActionText: "text-sm text-cb-text-muted",
    footerActionLink:
      "text-cb-brand-600 font-bold text-sm underline-offset-4 hover:underline dark:text-cb-brand-400",
    footer: "min-w-0 w-full max-w-full text-[11px] sm:text-xs text-cb-text-muted pt-2",
    footerPages: "text-[11px] text-cb-text-muted",
    identityPreview:
      "rounded-xl border border-cb-border bg-cb-brand-50/80 px-3 py-2 dark:bg-cb-surface-2",
    identityPreviewText: "text-sm text-cb-text-strong font-medium",
    identityPreviewEditButton:
      "text-cb-brand-700 font-semibold text-sm hover:underline dark:text-cb-brand-300",
    dividerRow: "w-full max-w-full py-2",
    dividerLine:
      "bg-gradient-to-r from-transparent via-cb-brand-200/80 to-transparent h-px dark:via-cb-border",
    dividerText:
      "text-cb-text-muted text-[10px] font-bold uppercase tracking-[0.12em] px-2",
    formResendCodeLink:
      "text-sm font-semibold text-cb-brand-700 hover:text-cb-brand-500 transition-colors dark:text-cb-brand-300",
    otpCodeFieldInput: [
      "w-full max-w-full rounded-xl h-12 text-lg font-semibold tracking-widest",
      "border-2 border-cb-border focus:border-cb-brand-500",
      "focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cb-brand-500)_20%,transparent)]",
    ].join(" "),
    alternativeMethodsBlock: "min-w-0 w-full max-w-full gap-2",
    alternativeMethodsBlockButton: [
      "w-full max-w-full text-sm rounded-xl border-2 border-cb-border h-11",
      "font-semibold text-cb-text-strong hover:bg-cb-brand-50 hover:border-cb-brand-300/50",
      "transition-colors duration-200",
    ].join(" "),
    spinner: "text-cb-brand-500",
    alertText:
      "text-sm text-red-900 bg-cb-danger-bg/95 border border-red-200/90 rounded-xl px-3 py-2.5 dark:bg-red-950/50 dark:text-red-100 dark:border-red-800/50",
    formFieldWarningText: "text-xs text-amber-900 dark:text-cb-warning",
    userPreviewMainIdentifier: "font-semibold text-cb-text-strong text-base",
    userPreviewSecondaryIdentifier: "text-cb-text-muted text-sm",
    passwordStrengthBar: "rounded-full overflow-hidden bg-cb-brand-100 h-1.5 dark:bg-cb-peach-deep/40",
    passwordStrengthBarItem:
      "rounded-full bg-gradient-to-r from-cb-warning via-cb-brand-500 to-cb-brand-700",
    backLink:
      "text-sm font-semibold text-cb-brand-700 hover:text-cb-brand-500 transition-colors dark:text-cb-brand-300",
    navbar: "hidden",
    navbarButton: "hidden",
    badge:
      "rounded-full bg-cb-brand-100 text-cb-brand-800 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 dark:bg-cb-brand-900/50 dark:text-cb-brand-200",
    selectButton:
      "rounded-xl border-2 border-cb-border h-11 font-semibold hover:bg-cb-brand-50 transition-colors",
  },
} as const;
