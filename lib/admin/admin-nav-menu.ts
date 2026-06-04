import type { ModuleKey } from "@/lib/admin/rbac";

/** عنصر تنقل لوحة الإدارة للقائمة (بدون نص معروض — يُترجم في الواجهة). */
export type AdminNavMenuItem = { href: string; module: ModuleKey; navKey: string };
