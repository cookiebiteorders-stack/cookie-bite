/**
 * Unified, premium stylesheet that powers every Cookie Bite notification template.
 *
 * Three layout families are supported:
 *  - "email"  → marketing / transactional / lifecycle customer emails
 *  - "report" → printable A4-style business reports (PDF / archive)
 *  - "dash"   → live admin dashboards (used inside the admin Template Library
 *               preview to render the same designs we ship in /admin).
 *
 * All CSS lives in one place so every template stays visually consistent and
 * any tweak (brand color, font, spacing) propagates everywhere.
 */

export const BRAND = {
  ink: "#1A1A2E",
  inkSoft: "#3C2A21",
  paper: "#F7F4EF",
  cream: "#FBF3EA",
  border: "#E5E0D8",
  borderSoft: "#F2DDC5",
  muted: "#888888",
  link: "#1a1a2e",
  accent: "#B25336",
  success: "#2E7D32",
  successSoft: "#E8F5E9",
  warning: "#F57C00",
  warningSoft: "#FFF8E1",
  danger: "#C62828",
  dangerSoft: "#FCE4EC",
  info: "#1565C0",
  infoSoft: "#E3F2FD",
  purple: "#6A1B9A",
  purpleSoft: "#F3E5F5",
} as const;

const FONT_STACK = "'Inter','DM Sans','Segoe UI',Arial,system-ui,sans-serif";
const SERIF_STACK = "'Playfair Display',Georgia,serif";

const EMAIL_RESET = `
*{box-sizing:border-box;}
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table,td{mso-table-lspace:0;mso-table-rspace:0;border-collapse:collapse;}
img{border:0;height:auto;line-height:100%;outline:0;text-decoration:none;-ms-interpolation-mode:bicubic;}
body{margin:0;padding:0;}
a{color:${BRAND.link};text-decoration:underline;}
`;

const COMMON = `
.brand-mono{font-family:${FONT_STACK};}
.brand-serif{font-family:${SERIF_STACK};}
`;

/**
 * EMAIL styles
 * Replicates `email-wrapper / email-body / email-footer / tag / tracking-box / ...`
 * plus the compact aliases used in the prompt files (`ew / eh / eb / ef / cta / tbl`).
 */
const EMAIL_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:#F2EEE8;font-family:${FONT_STACK};color:#1f1f2e;line-height:1.55;}
.email-wrapper,.ew{max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececec;box-shadow:0 6px 20px rgba(15,15,30,.06);}
.email-header,.eh{background:#1a1a2e;padding:24px 32px;text-align:center;color:#ffffff;}
.eh{padding:24px 32px;}
.logo{font-family:${SERIF_STACK};font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.6px;}
.email-body,.eb,.eb2{padding:32px;}
.eb2{padding:28px 32px 22px;}
.email-footer,.ef,.ef2{background:#fafafa;padding:18px 32px;text-align:center;font-size:12px;color:#888;border-top:1px solid #efefef;}
.ef p,.ef2 p{margin:0;line-height:1.6;}
.email-footer a,.ef a,.ef2 a{color:#888;text-decoration:none;margin:0 4px;}

.tag{display:inline-block;background:#1a1a2e;color:#ffffff;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;margin-bottom:14px;}
.tag.info,.tag.blue{background:${BRAND.info};}
.tag.warning,.tag.amber{background:${BRAND.warning};}
.tag.red{background:${BRAND.danger};}
.tag.green{background:${BRAND.success};}
.tag.purple{background:${BRAND.purple};}

h1{font-family:${SERIF_STACK};font-size:26px;line-height:1.2;color:#1a1a2e;margin:0 0 14px;font-weight:700;}
.eb p,.email-body p,.eb2 p{margin:0 0 12px;font-size:15px;color:#2b2b3a;}
.greeting{font-weight:600;color:#1a1a2e;}

.cta-btn,.cta{display:inline-block;background:#1a1a2e;color:#ffffff !important;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;letter-spacing:.02em;margin:14px auto;text-align:center;}
.cta-btn:hover,.cta:hover{background:#0e0e1f;}

.divider{display:block;height:1px;border:none;background:#eee;margin:22px 0;}
.info-box,.ibox{background:#f7f3ee;border-left:3px solid #1a1a2e;padding:14px 18px;border-radius:0 8px 8px 0;margin:18px 0;}
.info-box p,.ibox p{margin:0;font-size:13px;color:#4a4a55;line-height:1.55;}

.order-table,.tbl{width:100%;border-collapse:collapse;margin:18px 0;}
.order-table th,.tbl th{text-align:left;font-size:12px;letter-spacing:.06em;color:#888;text-transform:uppercase;padding:10px 6px;border-bottom:1px solid #eee;}
.order-table td,.tbl td{padding:11px 6px;font-size:14px;border-bottom:1px solid #f4f4f4;color:#2b2b3a;}
.order-table .total-row td,.tbl .total-row td{font-weight:700;color:#1a1a2e;border-bottom:none;padding-top:14px;}

.two-col{display:flex;gap:14px;margin:18px 0;flex-wrap:wrap;}
.col-box{flex:1;min-width:200px;background:#fafafa;border:1px solid #efefef;border-radius:8px;padding:14px 16px;}
.col-box h4{margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.06em;font-weight:600;}
.col-box p{margin:0;font-size:14px;color:#1a1a2e;line-height:1.5;}

.tracking-box{background:#f7f3ee;border:1px dashed #d8cfc1;border-radius:10px;padding:18px;text-align:center;margin:18px 0;}
.tracking-num{font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#1a1a2e;letter-spacing:2px;margin:6px 0;}

.otp-box{background:#fff7e6;border:1px dashed #f0c674;border-radius:10px;text-align:center;padding:18px;margin:18px 0;}
.otp{font-family:'Courier New',monospace;font-size:32px;font-weight:800;color:#1a1a2e;letter-spacing:8px;margin:0;}
.otp-box p{margin:8px 0 0;font-size:12px;color:#a07b16;font-weight:600;}

.stars{font-size:30px;color:#f5a623;letter-spacing:8px;margin:6px 0;}

.steps{margin:18px 0;}
.step{display:flex;gap:14px;align-items:flex-start;margin:10px 0;}
.step-num,.snum{flex:0 0 28px;width:28px;height:28px;background:#1a1a2e;color:#ffffff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;}
.step-content,.scnt{flex:1;}
.step-content h4,.scnt h4{margin:0 0 4px;font-size:14px;color:#1a1a2e;font-weight:600;}
.step-content p,.scnt p{margin:0;font-size:13px;color:#666;line-height:1.5;}

.kpi2{display:flex;gap:14px;margin:18px 0;flex-wrap:wrap;}
.kpi2 .k{flex:1;min-width:180px;background:#fafafa;border:1px solid #efefef;border-radius:8px;padding:14px 16px;}
.kpi2 .kl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.kpi2 .kv{font-size:22px;font-weight:700;color:#1a1a2e;}

.pts-box{background:linear-gradient(135deg,#6A1B9A 0%,#3F1276 100%);color:#fff;border-radius:10px;text-align:center;padding:22px 18px;margin:18px 0;}
.pts{font-size:36px;font-weight:800;letter-spacing:-1px;}
.pts-box p{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.85);}

/* ----- Internal reports (email-wrap variant used by Weekly Sales etc.) ----- */
.email-wrap{max-width:640px;margin:24px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e8e8e8;}
.email-head{background:#1a1a2e;padding:18px 24px;color:#fff;display:flex;justify-content:space-between;align-items:center;}
.email-head .store{font-family:${SERIF_STACK};font-size:18px;font-weight:800;letter-spacing:.4px;}
.email-head .period{font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.08em;}
.email-wrap .email-body{padding:24px;}
.email-wrap h1{font-size:20px;color:#1a1a2e;margin:0 0 12px;}
.email-kpi,.ekpi2{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;}
.email-kpi .ek,.ekpi2 .ek{flex:1;min-width:140px;background:#f7f5f1;border-radius:8px;padding:12px;text-align:center;}
.ek .el{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em;}
.ek .ev{font-size:20px;font-weight:700;color:#1a1a2e;margin:4px 0;}
.ek .ec{font-size:11px;font-weight:600;}
.ec.up{color:${BRAND.success};} .ec.dn{color:${BRAND.danger};} .ec.n{color:#888;}
.email-table,.etbl{width:100%;border-collapse:collapse;margin:12px 0;}
.email-table th,.etbl th{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#888;padding:8px 6px;border-bottom:1px solid #eee;text-align:left;}
.email-table td,.etbl td{padding:10px 6px;font-size:13px;border-bottom:1px solid #f4f4f4;color:#1a1a2e;}
.email-footer-b{background:#fafafa;padding:14px 24px;text-align:center;font-size:11px;color:#888;border-top:1px solid #efefef;}
.email-footer-b a,.ef2 a{color:#888;text-decoration:none;}
.eb2 h1{margin:0 0 8px;font-size:20px;}
.eb2 p{font-size:13px;}

@media only screen and (max-width:480px){
  .email-wrapper,.ew,.email-wrap{margin:0;border-radius:0;}
  .email-body,.eb,.eb2,.email-wrap .email-body{padding:22px;}
  .two-col,.kpi2,.email-kpi,.ekpi2{flex-direction:column;}
  h1{font-size:22px;}
}
`;

/**
 * REPORT (printable) styles — `doc-wrap / doc-head / doc-meta / kpi / doc-table / ...`
 */
const REPORT_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:#ECECEC;font-family:${FONT_STACK};color:#1a1a2e;padding:24px;}
.doc-wrap,.dw{max-width:880px;margin:0 auto;background:#ffffff;border:1px solid #d9d9d9;box-shadow:0 4px 18px rgba(0,0,0,.06);}
.doc-head,.dh{padding:32px 40px 22px;border-bottom:2px solid #1a1a2e;}
.doc-head .store,.dh .store{font-family:${SERIF_STACK};font-size:22px;font-weight:800;color:#1a1a2e;letter-spacing:.4px;}
.rtype{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin:14px 0 4px;}
.rtitle{font-family:${SERIF_STACK};font-size:32px;font-weight:700;color:#1a1a2e;margin:0;line-height:1.15;}

.doc-meta,.dmeta{display:flex;gap:32px;flex-wrap:wrap;padding:18px 40px;background:#fafafa;border-bottom:1px solid #efefef;}
.doc-meta-item,.dmi{display:flex;flex-direction:column;gap:2px;}
.doc-meta-item .lbl,.dmi .ml{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888;font-weight:600;}
.doc-meta-item .val,.dmi .mv{font-size:14px;color:#1a1a2e;font-weight:600;}

.doc-body,.db{padding:32px 40px;}
.doc-body h2,.db h2{font-family:${SERIF_STACK};font-size:18px;color:#1a1a2e;margin:26px 0 12px;border-bottom:1px solid #eee;padding-bottom:6px;font-weight:700;}
.doc-body h2:first-child,.db h2:first-child{margin-top:0;}

.kpi-row,.kpi3{display:flex;gap:16px;margin:8px 0 16px;flex-wrap:wrap;}
.kpi{flex:1;min-width:170px;background:#fafafa;border:1px solid #efefef;border-radius:8px;padding:16px 18px;}
.k-lbl,.kl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888;font-weight:600;margin-bottom:6px;}
.k-val,.kv{font-size:24px;font-weight:700;color:#1a1a2e;line-height:1;}
.k-chg,.kc{font-size:11px;font-weight:600;margin-top:6px;}
.k-chg.up,.kc.up{color:${BRAND.success};}
.k-chg.dn,.kc.dn{color:${BRAND.danger};}
.k-chg.g,.kc.g,.kc.n{color:#888;}

.chart-bar-wrap{margin:14px 0;}
.bar-row{display:flex;align-items:center;gap:12px;margin:8px 0;font-size:13px;}
.bar-row .lbl,.bar-row .bl{flex:0 0 110px;color:#1a1a2e;font-weight:600;}
.bar-track{flex:1;height:10px;background:#f1ede4;border-radius:5px;overflow:hidden;}
.bar-fill{height:100%;background:#1a1a2e;border-radius:5px;}
.bar-row .bval,.bar-row .bv{flex:0 0 80px;text-align:right;color:#666;font-weight:600;}

.doc-table,.dtbl{width:100%;border-collapse:collapse;margin:12px 0;}
.doc-table th,.dtbl th{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888;padding:10px 8px;border-bottom:2px solid #1a1a2e;text-align:left;font-weight:600;}
.doc-table td,.dtbl td{padding:11px 8px;font-size:13px;border-bottom:1px solid #efefef;color:#1a1a2e;}
.doc-table .tot td,.dtbl .tot td{font-weight:700;border-top:1px solid #1a1a2e;border-bottom:none;padding-top:12px;}

.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;padding:3px 8px;border-radius:999px;text-transform:uppercase;}
.badge.g{background:${BRAND.successSoft};color:${BRAND.success};}
.badge.b{background:${BRAND.infoSoft};color:${BRAND.info};}
.badge.y{background:#FFF3E0;color:${BRAND.warning};}
.badge.r{background:${BRAND.dangerSoft};color:${BRAND.danger};}

.note-box,.note{background:#fafafa;border-left:3px solid #1a1a2e;border-radius:0 6px 6px 0;padding:14px 18px;margin:18px 0;}
.note-box p,.note p{font-size:13px;color:#4a4a55;margin:0;line-height:1.55;font-style:italic;}

.doc-footer,.df{padding:18px 40px;border-top:1px solid #efefef;display:flex;justify-content:space-between;font-size:11px;color:#888;}
.doc-footer p,.df p{margin:0;}

@media print{
  body{background:#ffffff;padding:0;}
  .doc-wrap,.dw{border:none;box-shadow:none;}
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
 * DASHBOARD styles — `dash-wrap / dash-nav / dash-kpi / mini-bar-row / dash-table / ...`
 */
const DASH_STYLES = `
${EMAIL_RESET}
${COMMON}
body{background:#F1F0EC;font-family:${FONT_STACK};color:#1a1a2e;padding:24px;}
.dash-wrap{max-width:1100px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8;box-shadow:0 8px 24px rgba(0,0,0,.05);}
.dash-nav{display:flex;align-items:center;justify-content:space-between;background:#1a1a2e;padding:14px 24px;color:#fff;}
.dash-nav .store{font-family:${SERIF_STACK};font-size:18px;font-weight:800;letter-spacing:.4px;}
.nav-items{display:flex;gap:18px;font-size:13px;font-weight:600;color:rgba(255,255,255,.65);}
.nav-items span{cursor:pointer;padding:6px 2px;border-bottom:2px solid transparent;}
.nav-items .act{color:#fff;border-bottom-color:#fff;}

.dash-body,.db2{padding:26px 30px;}
.dash-title,.dt{font-family:${SERIF_STACK};font-size:26px;font-weight:700;color:#1a1a2e;margin:0 0 4px;}
.dash-sub,.ds{font-size:12px;color:#888;letter-spacing:.04em;margin-bottom:18px;}

.dash-kpi,.dk3,.dk4{display:grid;gap:14px;margin:14px 0 24px;}
.dash-kpi{grid-template-columns:repeat(4,minmax(0,1fr));}
.dk3{grid-template-columns:repeat(3,minmax(0,1fr));}
.dk4{grid-template-columns:repeat(4,minmax(0,1fr));}
.dk{background:#fafafa;border:1px solid #efefef;border-radius:10px;padding:14px 16px;}
.dl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888;font-weight:600;margin-bottom:6px;}
.dv{font-size:24px;font-weight:700;color:#1a1a2e;line-height:1;}
.dc{font-size:11px;font-weight:600;margin-top:6px;}
.dc.up{color:${BRAND.success};}
.dc.dn{color:${BRAND.danger};}
.dc.n{color:#888;}

.dash-chart-area,.chart-area{margin:20px 0;}
.dash-chart-area h3,.chart-area h3{font-size:13px;font-weight:600;color:#1a1a2e;margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em;}
.mini-bar-row{display:flex;align-items:center;gap:12px;font-size:12px;margin:7px 0;}
.mini-bar-row .ml{flex:0 0 70px;color:#666;font-weight:600;}
.mini-bar-track,.mini-track{flex:1;height:8px;background:#f1ede4;border-radius:4px;overflow:hidden;}
.mini-bar-fill,.mini-fill{height:100%;border-radius:4px;background:#1a1a2e;}
.mini-bar-row .mv{flex:0 0 80px;text-align:right;color:#666;}

.dash-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px;}
.dash-panel{background:#fafafa;border:1px solid #efefef;border-radius:10px;padding:16px 18px;}
.dash-panel h3{font-size:12px;font-weight:600;color:#1a1a2e;margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em;}
.dash-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px;border-bottom:1px solid #efefef;}
.dash-row:last-child{border-bottom:none;}
.dash-row .dr-l,.dash-row .drl{color:#1a1a2e;}
.dash-row .dr-r,.dash-row .drr{color:#666;font-weight:600;}
.status-dot,.sdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;}
.status-dot.g,.sdot.g{background:${BRAND.success};}
.status-dot.y,.sdot.y{background:${BRAND.warning};}
.status-dot.r,.sdot.r{background:${BRAND.danger};}
.status-dot.b,.sdot.b{background:${BRAND.info};}

.dash-table,.dash-tbl{width:100%;border-collapse:collapse;margin-top:18px;}
.dash-table th,.dash-tbl th{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#888;padding:10px 8px;border-bottom:1px solid #1a1a2e;text-align:left;}
.dash-table td,.dash-tbl td{padding:11px 8px;font-size:13px;border-bottom:1px solid #efefef;color:#1a1a2e;}

.dash-footer{padding:14px 30px;border-top:1px solid #efefef;display:flex;justify-content:space-between;font-size:11px;color:#888;}
.dash-footer p{margin:0;}

/* badges reused */
.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;padding:3px 8px;border-radius:999px;text-transform:uppercase;}
.badge.g{background:${BRAND.successSoft};color:${BRAND.success};}
.badge.b{background:${BRAND.infoSoft};color:${BRAND.info};}
.badge.y{background:#FFF3E0;color:${BRAND.warning};}
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
