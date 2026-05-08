export type UserRole = "owner" | "admin" | "staff" | "customer";

export type PermissionLevel = "full" | "limited" | "view" | "none";

export type ModuleKey =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "discounts"
  | "media"
  | "cms"
  | "analytics"
  | "financial"
  | "invoices"
  | "shipping"
  | "payments"
  | "roles"
  | "settings"
  | "audit";

export const roleMatrix: Record<UserRole, Record<ModuleKey, PermissionLevel>> = {
  owner: {
    dashboard: "full",
    products: "full",
    orders: "full",
    customers: "full",
    discounts: "full",
    media: "full",
    cms: "full",
    analytics: "full",
    financial: "full",
    invoices: "full",
    shipping: "full",
    payments: "full",
    roles: "full",
    settings: "full",
    audit: "full",
  },
  admin: {
    dashboard: "full",
    products: "full",
    orders: "full",
    customers: "full",
    discounts: "limited",
    media: "full",
    cms: "full",
    analytics: "limited",
    financial: "none",
    invoices: "full",
    shipping: "full",
    payments: "none",
    roles: "none",
    settings: "none",
    audit: "view",
  },
  staff: {
    dashboard: "limited",
    products: "view",
    orders: "limited",
    customers: "view",
    discounts: "none",
    media: "view",
    cms: "none",
    analytics: "none",
    financial: "none",
    invoices: "view",
    shipping: "limited",
    payments: "none",
    roles: "none",
    settings: "none",
    audit: "none",
  },
  customer: {
    dashboard: "none",
    products: "none",
    orders: "view",
    customers: "none",
    discounts: "none",
    media: "none",
    cms: "none",
    analytics: "none",
    financial: "none",
    invoices: "view",
    shipping: "none",
    payments: "none",
    roles: "none",
    settings: "none",
    audit: "none",
  },
};

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case "owner":
      return "OWNER";
    case "admin":
      return "ADMIN";
    case "staff":
      return "STAFF";
    default:
      return "CUSTOMER";
  }
}

export function canAccess(role: UserRole, module: ModuleKey) {
  return roleMatrix[role][module] !== "none";
}

export const adminRouteModuleMap: Record<string, ModuleKey> = {
  "/admin": "dashboard",
  "/admin/products": "products",
  "/admin/orders": "orders",
  "/admin/customers": "customers",
  "/admin/discounts": "discounts",
  "/admin/reports": "analytics",
  "/admin/financial": "financial",
  "/admin/invoices": "invoices",
  "/admin/payments": "payments",
  "/admin/roles": "roles",
  "/admin/shipping": "shipping",
  "/admin/audit-logs": "audit",
  "/admin/settings": "settings",
};

