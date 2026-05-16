/**
 * Unified, premium stylesheet that powers every Cookie Bite notification template.
 *
 * Three layout families are supported:
 *  - "email"  → marketing / transactional / lifecycle customer emails
 *  - "report" → printable A4-style business reports (PDF / archive)
 *  - "dash"   → live admin dashboards (used inside the admin Template Library
 *               preview to render the same designs we ship in /admin).
 *
 * The palette mirrors the public Cookie Bite site (cream + terracotta + mint),
 * matches `/lib/brand.ts` (`logoHex: #c1692c`), and leaves a single source of
 * truth for any future visual tweak.
 */

export const BRAND = {
  // Warm ink (used for headings, primary text, table borders)
  ink: "#3D2814",
  inkSoft: "#5C3A21",
  // Light surfaces
  paper: "#FBF3EA",
  cream: "#FBF3EA",
  cream2: "#F4EADA",
  surface: "#FFFFFF",
  surfaceAlt: "#FFF9F0",
  // Borders
  border: "#EDE3D2",
  borderSoft: "#F2DDC5",
  // Muted / secondary text
  muted: "#9C8B7A",
  mutedSoft: "#BFAE9B",
  // Brand accents (Cookie Bite terracotta)
  accent: "#C1692C",
  accentDark: "#B45309",
  accentSoft: "#F2DABA",
  accentTint: "#FDE8D8",
  // Calm secondary (mint)
  mint: "#A4D4B4",
  mintDeep: "#5DAA84",
  mintSoft: "#E2F1E8",
  // Backwards-compat aliases (older templates referenced these)
  link: "#B45309",
  // Status palette tuned to feel warm next to the cream surfaces
  success: "#16A34A",
  successSoft: "#DCFCE7",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  warningDeep: "#92400E",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  dangerDeep: "#7F1D1D",
  info: "#0284C7",
  infoSoft: "#E0F2FE",
  infoDeep: "#075985",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  purpleDeep: "#5B21B6",
} as const;

/**
 * Map of *legacy* hex codes that older template bodies still reference inline.
 * `renderShell` substitutes any literal occurrence with the brand-aligned
 * equivalent so the visual rebrand applies even without re-editing every file.
 */
export const LEGACY_COLOR_MAP: Record<string, string> = {
  "#1a1a2e": BRAND.ink,
  "#0e0e1f": "#2A1A0C",
  "#1a3a1a": BRAND.mintDeep,
  "#7d4e00": BRAND.warningDeep,
  "#7d1a1a": BRAND.dangerDeep,
  "#c62828": BRAND.danger,
  "#fce4ec": BRAND.dangerSoft,
  "#f57c00": BRAND.warning,
  "#fff8e1": BRAND.warningSoft,
  "#a07b16": BRAND.warningDeep,
  "#f0c674": BRAND.accentSoft,
  "#fff7e6": BRAND.accentTint,
  "#f5a623": BRAND.warning,
  "#7d4e0a": BRAND.warningDeep,
  "#e65100": BRAND.warning,
  "#f7f3ee": BRAND.cream2,
  "#d8cfc1": BRAND.borderSoft,
  "#f2eee8": BRAND.cream,
  "#1565c0": BRAND.info,
  "#e3f2fd": BRAND.infoSoft,
  "#6a1b9a": BRAND.purple,
  "#3f1276": BRAND.purpleDeep,
};

const FONT_STACK =
  "'Inter','DM Sans','Helvetica Neue','Segoe UI',Arial,system-ui,sans-serif";
const SERIF_STACK = "'Playfair Display','Cormorant Garamond',Georgia,serif";

const EMAIL_RESET = `
*{box-sizing:border-box;}
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table,td{mso-table-lspace:0;mso-table-rspace:0;border-collapse:collapse;}
img{border:0;height:auto;line-height:100%;outline:0;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
body{margin:0;padding:0;}
a{color:${BRAND.accentDark};text-decoration:none;}
a:hover{text-decoration:underline;}
`;

const COMMON = `
.brand-mono{font-family:${FONT_STACK};}
.brand-serif{font-family:${SERIF_STACK};}
`;

/**
 * EMAIL styles — warm cream paper, serif headings in terracotta-ink, terracotta
 * CTAs. Backwards-compatible class names (.email-wrapper / .ew, .email-header /
 * .eh, .email-body / .eb / .eb2, .email-footer / .ef / .ef2, etc.) so legacy
 * templates work unchanged.
 */
const EMAIL_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:${BRAND.cream};font-family:${FONT_STACK};color:${BRAND.inkSoft};line-height:1.6;}

/* --- Outer wrapper (a paper card on the cream backdrop) -------------------- */
.email-wrapper,.ew{max-width:620px;margin:24px auto;background:${BRAND.surface};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 18px 40px -22px rgba(61,40,20,.18);}

/* --- Header (cream paper, brand bar at top) -------------------------------- */
.email-header,.eh{background:${BRAND.surfaceAlt};padding:0;text-align:center;color:${BRAND.ink};border-bottom:1px solid ${BRAND.border};}
.brand-bar{height:4px;background:linear-gradient(90deg,${BRAND.accent} 0%,${BRAND.accentDark} 50%,${BRAND.accent} 100%);}
.brand-block{padding:26px 24px 22px;}
.brand-mark{display:block;margin:0 auto 10px;border:0;}
.brand-name{font-family:${SERIF_STACK};font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:.6px;line-height:1.1;}
.brand-tag{margin-top:6px;font-family:${FONT_STACK};font-size:10px;color:${BRAND.muted};letter-spacing:.22em;text-transform:uppercase;}
/* Period / sub-label sometimes rendered alongside the brand block in
   internal-report headers (e.g. campaign-performance, supplier-reorder). */
.eh .period{display:block;text-align:center;padding:0 24px 16px;margin-top:-4px;font-family:${FONT_STACK};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.accentDark};font-weight:700;}
/* Legacy .logo text is hidden but kept for fallback — branded block above
   replaces it via shell.ts injection. */
.logo{font-family:${SERIF_STACK};font-size:0;line-height:0;color:transparent;}

/* --- Body ------------------------------------------------------------------ */
.email-body,.eb,.eb2{padding:34px 36px;color:${BRAND.inkSoft};}
.eb2{padding:30px 36px 24px;}

/* --- Footer ---------------------------------------------------------------- */
.email-footer,.ef,.ef2{background:${BRAND.cream2};padding:20px 32px;text-align:center;font-size:12px;color:${BRAND.muted};border-top:1px solid ${BRAND.border};}
.ef p,.ef2 p{margin:0;line-height:1.7;}
.email-footer a,.ef a,.ef2 a{color:${BRAND.accentDark};text-decoration:none;margin:0 6px;font-weight:600;}
.email-footer a:hover,.ef a:hover,.ef2 a:hover{text-decoration:underline;}

/* --- Tags ------------------------------------------------------------------ */
.tag{display:inline-block;background:${BRAND.accentTint};color:${BRAND.accentDark};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:6px 14px;border-radius:999px;margin-bottom:14px;border:1px solid ${BRAND.borderSoft};}
.tag.info,.tag.blue{background:${BRAND.infoSoft};color:${BRAND.infoDeep};border-color:${BRAND.infoSoft};}
.tag.warning,.tag.amber{background:${BRAND.warningSoft};color:${BRAND.warningDeep};border-color:${BRAND.warningSoft};}
.tag.red{background:${BRAND.dangerSoft};color:${BRAND.dangerDeep};border-color:${BRAND.dangerSoft};}
.tag.green{background:${BRAND.mintSoft};color:${BRAND.mintDeep};border-color:${BRAND.mintSoft};}
.tag.purple{background:${BRAND.purpleSoft};color:${BRAND.purpleDeep};border-color:${BRAND.purpleSoft};}

/* --- Typography ------------------------------------------------------------ */
h1{font-family:${SERIF_STACK};font-size:28px;line-height:1.18;color:${BRAND.ink};margin:0 0 16px;font-weight:700;letter-spacing:-.01em;}
.eb p,.email-body p,.eb2 p{margin:0 0 14px;font-size:15px;color:${BRAND.inkSoft};line-height:1.65;}
.greeting{font-weight:600;color:${BRAND.ink};font-size:16px;}

/* --- CTA button (terracotta, soft shadow) ---------------------------------- */
.cta-btn,.cta{display:inline-block;background:${BRAND.accentDark};color:#ffffff !important;font-weight:700;text-decoration:none;padding:14px 30px;border-radius:999px;font-size:14px;letter-spacing:.04em;margin:14px auto;text-align:center;box-shadow:0 6px 18px -8px rgba(180,83,9,.65);transition:background .15s ease;}
.cta-btn:hover,.cta:hover{background:${BRAND.accent};}
.cta-secondary{display:inline-block;background:transparent;color:${BRAND.accentDark} !important;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:13px;letter-spacing:.02em;border:1.5px solid ${BRAND.borderSoft};}

/* --- Divider --------------------------------------------------------------- */
.divider{display:block;height:1px;border:none;background:${BRAND.border};margin:24px 0;}

/* --- Info box (warm peach left-rule) --------------------------------------- */
.info-box,.ibox{background:${BRAND.cream2};border-left:3px solid ${BRAND.accent};padding:14px 18px;border-radius:0 10px 10px 0;margin:18px 0;}
.info-box p,.ibox p{margin:0;font-size:13.5px;color:${BRAND.inkSoft};line-height:1.6;}

/* --- Order / data tables --------------------------------------------------- */
.order-table,.tbl{width:100%;border-collapse:collapse;margin:18px 0;}
.order-table th,.tbl th{text-align:left;font-size:11px;letter-spacing:.08em;color:${BRAND.muted};text-transform:uppercase;padding:10px 6px;border-bottom:1px solid ${BRAND.border};font-weight:700;}
.order-table td,.tbl td{padding:12px 6px;font-size:14px;border-bottom:1px solid ${BRAND.border};color:${BRAND.inkSoft};}
.order-table .total-row td,.tbl .total-row td{font-weight:700;color:${BRAND.ink};border-bottom:none;border-top:2px solid ${BRAND.ink};padding-top:14px;font-size:15px;}

/* --- Two-column boxes ------------------------------------------------------ */
.two-col{display:flex;gap:14px;margin:18px 0;flex-wrap:wrap;}
.col-box{flex:1;min-width:200px;background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;}
.col-box h4{margin:0 0 6px;font-size:11px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.08em;font-weight:700;}
.col-box p{margin:0;font-size:14px;color:${BRAND.ink};line-height:1.5;}

/* --- Tracking box (dashed peach border) ------------------------------------ */
.tracking-box{background:${BRAND.accentTint};border:1px dashed ${BRAND.accent};border-radius:12px;padding:20px;text-align:center;margin:18px 0;}
.tracking-box > p{color:${BRAND.accentDark} !important;font-weight:700;letter-spacing:.12em;font-size:11px;margin:0 0 6px;}
.tracking-num{font-family:'Courier New',monospace;font-size:20px;font-weight:700;color:${BRAND.ink};letter-spacing:2px;margin:6px 0;}

/* --- OTP box (warm) -------------------------------------------------------- */
.otp-box{background:${BRAND.accentTint};border:1px dashed ${BRAND.accent};border-radius:12px;text-align:center;padding:20px;margin:18px 0;}
.otp{font-family:'Courier New',monospace;font-size:34px;font-weight:800;color:${BRAND.ink};letter-spacing:8px;margin:0;}
.otp-box p{margin:8px 0 0;font-size:12px;color:${BRAND.accentDark};font-weight:700;}

.stars{font-size:32px;color:${BRAND.accent};letter-spacing:8px;margin:6px 0;}

/* --- Step list ------------------------------------------------------------- */
.steps{margin:18px 0;}
.step{display:flex;gap:14px;align-items:flex-start;margin:12px 0;}
.step-num,.snum{flex:0 0 30px;width:30px;height:30px;background:${BRAND.accentDark};color:#ffffff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;}
.step-content,.scnt{flex:1;}
.step-content h4,.scnt h4{margin:0 0 4px;font-size:14px;color:${BRAND.ink};font-weight:700;}
.step-content p,.scnt p{margin:0;font-size:13px;color:${BRAND.inkSoft};line-height:1.55;}

/* --- KPI grid -------------------------------------------------------------- */
.kpi2{display:flex;gap:14px;margin:18px 0;flex-wrap:wrap;}
.kpi2 .k{flex:1;min-width:180px;background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px;padding:14px 16px;}
.kpi2 .kl{font-size:11px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;font-weight:700;}
.kpi2 .kv{font-size:22px;font-weight:700;color:${BRAND.ink};}

/* --- Reward / points hero -------------------------------------------------- */
.pts-box{background:linear-gradient(135deg,${BRAND.accentDark} 0%,${BRAND.accent} 100%);color:#fff;border-radius:14px;text-align:center;padding:24px 18px;margin:18px 0;box-shadow:0 12px 28px -16px rgba(180,83,9,.55);}
.pts{font-size:38px;font-weight:800;letter-spacing:-1px;}
.pts-box p{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.92);}

/* ----- Internal reports (email-wrap variant used by Weekly Sales etc.) ----- */
.email-wrap{max-width:660px;margin:24px auto;background:${BRAND.surface};border-radius:14px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 14px 36px -22px rgba(61,40,20,.18);}
.email-head{background:${BRAND.surfaceAlt};padding:18px 24px;color:${BRAND.ink};display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${BRAND.border};border-top:4px solid ${BRAND.accent};}
.email-head .store{font-family:${SERIF_STACK};font-size:18px;font-weight:800;color:${BRAND.ink};letter-spacing:.4px;}
.email-head .period{font-size:11px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.1em;font-weight:600;}
.email-wrap .email-body{padding:26px 28px;}
.email-wrap h1{font-size:22px;color:${BRAND.ink};margin:0 0 12px;}
.email-kpi,.ekpi2{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;}
.email-kpi .ek,.ekpi2 .ek{flex:1;min-width:140px;background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px;padding:12px;text-align:center;}
.ek .el{font-size:10px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.08em;font-weight:700;}
.ek .ev{font-size:20px;font-weight:700;color:${BRAND.ink};margin:6px 0;}
.ek .ec{font-size:11px;font-weight:700;}
.ec.up{color:${BRAND.success};} .ec.dn{color:${BRAND.danger};} .ec.n{color:${BRAND.muted};}
.email-table,.etbl{width:100%;border-collapse:collapse;margin:12px 0;}
.email-table th,.etbl th{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted};padding:10px 6px;border-bottom:1px solid ${BRAND.border};text-align:left;font-weight:700;}
.email-table td,.etbl td{padding:11px 6px;font-size:13px;border-bottom:1px solid ${BRAND.border};color:${BRAND.inkSoft};}
.email-footer-b{background:${BRAND.cream2};padding:16px 24px;text-align:center;font-size:11px;color:${BRAND.muted};border-top:1px solid ${BRAND.border};}
.email-footer-b a,.ef2 a{color:${BRAND.accentDark};text-decoration:none;font-weight:600;}
.eb2 h1{margin:0 0 8px;font-size:22px;}
.eb2 p{font-size:13.5px;}

@media only screen and (max-width:480px){
  .email-wrapper,.ew,.email-wrap{margin:0;border-radius:0;border-left:none;border-right:none;}
  .email-body,.eb,.eb2,.email-wrap .email-body{padding:24px 22px;}
  .two-col,.kpi2,.email-kpi,.ekpi2{flex-direction:column;}
  h1{font-size:24px;}
  .brand-block{padding:22px 18px 20px;}
}
`;

/**
 * REPORT (printable A4) styles — warm cream document with terracotta brand bar.
 */
const REPORT_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:#EFE8DC;font-family:${FONT_STACK};color:${BRAND.inkSoft};padding:24px;}
.doc-wrap,.dw{max-width:880px;margin:0 auto;background:${BRAND.surface};border:1px solid ${BRAND.border};box-shadow:0 8px 28px -10px rgba(61,40,20,.18);border-radius:6px;overflow:hidden;}
.doc-head,.dh{padding:30px 40px 22px;border-bottom:2px solid ${BRAND.accent};background:${BRAND.surfaceAlt};position:relative;}
.doc-head::before,.dh::before{content:"";position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,${BRAND.accent} 0%,${BRAND.accentDark} 50%,${BRAND.accent} 100%);}
.doc-head .store,.dh .store{font-family:${SERIF_STACK};font-size:22px;font-weight:800;color:${BRAND.ink};letter-spacing:.4px;}
.rtype{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.accentDark};margin:14px 0 4px;font-weight:700;}
.rtitle{font-family:${SERIF_STACK};font-size:32px;font-weight:700;color:${BRAND.ink};margin:0;line-height:1.15;}

.doc-meta,.dmeta{display:flex;gap:32px;flex-wrap:wrap;padding:18px 40px;background:${BRAND.cream2};border-bottom:1px solid ${BRAND.border};}
.doc-meta-item,.dmi{display:flex;flex-direction:column;gap:2px;}
.doc-meta-item .lbl,.dmi .ml{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};font-weight:700;}
.doc-meta-item .val,.dmi .mv{font-size:14px;color:${BRAND.ink};font-weight:700;}

.doc-body,.db{padding:32px 40px;}
.doc-body h2,.db h2{font-family:${SERIF_STACK};font-size:18px;color:${BRAND.ink};margin:26px 0 12px;border-bottom:1px solid ${BRAND.border};padding-bottom:6px;font-weight:700;}
.doc-body h2:first-child,.db h2:first-child{margin-top:0;}

.kpi-row,.kpi3{display:flex;gap:16px;margin:8px 0 16px;flex-wrap:wrap;}
.kpi{flex:1;min-width:170px;background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:10px;padding:16px 18px;}
.k-lbl,.kl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};font-weight:700;margin-bottom:6px;}
.k-val,.kv{font-size:24px;font-weight:700;color:${BRAND.ink};line-height:1;}
.k-chg,.kc{font-size:11px;font-weight:700;margin-top:6px;}
.k-chg.up,.kc.up{color:${BRAND.success};}
.k-chg.dn,.kc.dn{color:${BRAND.danger};}
.k-chg.g,.kc.g,.kc.n{color:${BRAND.muted};}

.chart-bar-wrap{margin:14px 0;}
.bar-row{display:flex;align-items:center;gap:12px;margin:8px 0;font-size:13px;}
.bar-row .lbl,.bar-row .bl{flex:0 0 110px;color:${BRAND.ink};font-weight:600;}
.bar-track{flex:1;height:10px;background:${BRAND.cream2};border-radius:5px;overflow:hidden;}
.bar-fill{height:100%;background:linear-gradient(90deg,${BRAND.accent} 0%,${BRAND.accentDark} 100%);border-radius:5px;}
.bar-row .bval,.bar-row .bv{flex:0 0 80px;text-align:right;color:${BRAND.inkSoft};font-weight:600;}

.doc-table,.dtbl{width:100%;border-collapse:collapse;margin:12px 0;}
.doc-table th,.dtbl th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};padding:10px 8px;border-bottom:2px solid ${BRAND.accent};text-align:left;font-weight:700;}
.doc-table td,.dtbl td{padding:11px 8px;font-size:13px;border-bottom:1px solid ${BRAND.border};color:${BRAND.inkSoft};}
.doc-table .tot td,.dtbl .tot td{font-weight:700;border-top:1px solid ${BRAND.ink};border-bottom:none;padding-top:12px;color:${BRAND.ink};}

.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;text-transform:uppercase;}
.badge.g{background:${BRAND.mintSoft};color:${BRAND.mintDeep};}
.badge.b{background:${BRAND.infoSoft};color:${BRAND.info};}
.badge.y{background:${BRAND.warningSoft};color:${BRAND.warningDeep};}
.badge.r{background:${BRAND.dangerSoft};color:${BRAND.danger};}

.note-box,.note{background:${BRAND.cream2};border-left:3px solid ${BRAND.accent};border-radius:0 8px 8px 0;padding:14px 18px;margin:18px 0;}
.note-box p,.note p{font-size:13px;color:${BRAND.inkSoft};margin:0;line-height:1.6;font-style:italic;}

.doc-footer,.df{padding:18px 40px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;font-size:11px;color:${BRAND.muted};background:${BRAND.cream2};}
.doc-footer p,.df p{margin:0;}

@media print{
  body{background:#ffffff;padding:0;}
  .doc-wrap,.dw{border:none;box-shadow:none;border-radius:0;}
}

@media only screen and (max-width:640px){
  .doc-head,.dh{padding:24px 22px 16px;}
  .doc-meta,.dmeta{padding:14px 22px;gap:14px;}
  .doc-body,.db{padding:22px;}
  .kpi-row,.kpi3{flex-direction:column;}
  .doc-footer,.df{flex-direction:column;gap:4px;padding:14px 22px;}
  .rtitle{font-size:24px;}
}
`;

/**
 * DASHBOARD styles — admin preview canvas for dashboards & reports.
 */
const DASH_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:${BRAND.cream};font-family:${FONT_STACK};color:${BRAND.inkSoft};padding:24px;}
.dash-wrap{max-width:1100px;margin:0 auto;background:${BRAND.surface};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 14px 36px -16px rgba(61,40,20,.16);}
.dash-nav{display:flex;align-items:center;justify-content:space-between;background:${BRAND.surfaceAlt};padding:14px 24px;color:${BRAND.ink};border-bottom:1px solid ${BRAND.border};border-top:4px solid ${BRAND.accent};}
.dash-nav .store{font-family:${SERIF_STACK};font-size:18px;font-weight:800;color:${BRAND.ink};letter-spacing:.4px;}
.nav-items{display:flex;gap:18px;font-size:13px;font-weight:600;color:${BRAND.muted};}
.nav-items span{cursor:pointer;padding:6px 2px;border-bottom:2px solid transparent;}
.nav-items .act{color:${BRAND.accentDark};border-bottom-color:${BRAND.accent};}

.dash-body,.db2{padding:26px 30px;}
.dash-title,.dt{font-family:${SERIF_STACK};font-size:28px;font-weight:700;color:${BRAND.ink};margin:0 0 4px;}
.dash-sub,.ds{font-size:12px;color:${BRAND.muted};letter-spacing:.04em;margin-bottom:18px;}

.dash-kpi,.dk3,.dk4{display:grid;gap:14px;margin:14px 0 24px;}
.dash-kpi{grid-template-columns:repeat(4,minmax(0,1fr));}
.dk3{grid-template-columns:repeat(3,minmax(0,1fr));}
.dk4{grid-template-columns:repeat(4,minmax(0,1fr));}
.dk{background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:12px;padding:14px 16px;}
.dl{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};font-weight:700;margin-bottom:6px;}
.dv{font-size:24px;font-weight:700;color:${BRAND.ink};line-height:1;}
.dc{font-size:11px;font-weight:700;margin-top:6px;}
.dc.up{color:${BRAND.success};}
.dc.dn{color:${BRAND.danger};}
.dc.n{color:${BRAND.muted};}

.dash-chart-area,.chart-area{margin:20px 0;}
.dash-chart-area h3,.chart-area h3{font-size:13px;font-weight:700;color:${BRAND.ink};margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em;}
.mini-bar-row{display:flex;align-items:center;gap:12px;font-size:12px;margin:7px 0;}
.mini-bar-row .ml{flex:0 0 70px;color:${BRAND.inkSoft};font-weight:600;}
.mini-bar-track,.mini-track{flex:1;height:8px;background:${BRAND.cream2};border-radius:4px;overflow:hidden;}
.mini-bar-fill,.mini-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,${BRAND.accent} 0%,${BRAND.accentDark} 100%);}
.mini-bar-row .mv{flex:0 0 80px;text-align:right;color:${BRAND.inkSoft};}

.dash-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px;}
.dash-panel{background:${BRAND.surfaceAlt};border:1px solid ${BRAND.border};border-radius:12px;padding:16px 18px;}
.dash-panel h3{font-size:12px;font-weight:700;color:${BRAND.ink};margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em;}
.dash-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px;border-bottom:1px solid ${BRAND.border};}
.dash-row:last-child{border-bottom:none;}
.dash-row .dr-l,.dash-row .drl{color:${BRAND.ink};}
.dash-row .dr-r,.dash-row .drr{color:${BRAND.inkSoft};font-weight:600;}
.status-dot,.sdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;}
.status-dot.g,.sdot.g{background:${BRAND.success};}
.status-dot.y,.sdot.y{background:${BRAND.warning};}
.status-dot.r,.sdot.r{background:${BRAND.danger};}
.status-dot.b,.sdot.b{background:${BRAND.info};}

.dash-table,.dash-tbl{width:100%;border-collapse:collapse;margin-top:18px;}
.dash-table th,.dash-tbl th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${BRAND.muted};padding:10px 8px;border-bottom:1px solid ${BRAND.accent};text-align:left;font-weight:700;}
.dash-table td,.dash-tbl td{padding:11px 8px;font-size:13px;border-bottom:1px solid ${BRAND.border};color:${BRAND.inkSoft};}

.dash-footer{padding:14px 30px;border-top:1px solid ${BRAND.border};background:${BRAND.cream2};display:flex;justify-content:space-between;font-size:11px;color:${BRAND.muted};}
.dash-footer p{margin:0;}

.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;padding:4px 9px;border-radius:999px;text-transform:uppercase;}
.badge.g{background:${BRAND.mintSoft};color:${BRAND.mintDeep};}
.badge.b{background:${BRAND.infoSoft};color:${BRAND.info};}
.badge.y{background:${BRAND.warningSoft};color:${BRAND.warningDeep};}
.badge.r{background:${BRAND.dangerSoft};color:${BRAND.danger};}

@media only screen and (max-width:900px){
  .dash-kpi,.dk3,.dk4,.dash-two{grid-template-columns:1fr 1fr;}
  .nav-items{display:none;}
}
@media only screen and (max-width:560px){
  .dash-kpi,.dk3,.dk4,.dash-two{grid-template-columns:1fr;}
  .dash-body,.db2{padding:18px 20px;}
}
`;

export type TemplateVariant = "email" | "report" | "dash";

export function getStylesForVariant(variant: TemplateVariant): string {
  switch (variant) {
    case "report":
      return REPORT_STYLES;
    case "dash":
      return DASH_STYLES;
    case "email":
    default:
      return EMAIL_STYLES;
  }
}

/** Brand fonts re-exported for use by the shell (header injection, etc.). */
export const BRAND_FONTS = { sans: FONT_STACK, serif: SERIF_STACK } as const;
