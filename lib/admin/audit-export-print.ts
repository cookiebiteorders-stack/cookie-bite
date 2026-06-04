import type { AuditLogRow } from "@/lib/admin/audit-display";

export function printAuditLogsTable(
  rows: AuditLogRow[],
  labels: {
    title: string;
    generated: string;
    cols: Record<string, string>;
  },
  formatCell: (log: AuditLogRow) => {
    time: string;
    user: string;
    role: string;
    action: string;
    module: string;
    entity: string;
    ip: string;
  },
) {
  const c = labels.cols;
  const head = `<tr>${[c.time, c.user, c.role, c.action, c.module, c.entity, c.ip]
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr>`;
  const body = rows
    .map((log) => {
      const f = formatCell(log);
      return `<tr><td>${f.time}</td><td>${f.user}</td><td>${f.role}</td><td>${f.action}</td><td>${f.module}</td><td>${f.entity}</td><td>${f.ip}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${labels.title}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a1a1a}
h1{font-size:18px;margin:0 0 8px}
p{font-size:12px;color:#555;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}
th{background:#f5f0eb}
@media print{body{padding:12px}}
</style></head><body>
<h1>${labels.title}</h1>
<p>${labels.generated}</p>
<table><thead>${head}</thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!w) {
    window.alert("تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
