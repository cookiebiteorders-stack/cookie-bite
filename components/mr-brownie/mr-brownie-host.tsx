"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MrBrownieChat = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-chat").then((m) => m.MrBrownieChat),
  { ssr: false },
);

/** مسارات فيها Mr. Brownie مضمّن في الصفحة — لا نعرض الـ FAB العائم فوقها */
const HIDE_FLOATING_PATHS = ["/gift-box/build"];

export function MrBrownieHost() {
  const pathname = usePathname();
  const hide = HIDE_FLOATING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (hide) return null;
  return <MrBrownieChat />;
}
