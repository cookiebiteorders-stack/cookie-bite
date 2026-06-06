import type { Addon } from "@/lib/addons/types";

/** مرجع ثابت — تجنّب `?? []` التي تُنشئ مصفوفة جديدة كل render */
export const EMPTY_LINKED_ADDONS: Addon[] = [];
