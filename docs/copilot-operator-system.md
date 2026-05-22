# Mrs. Cookie — Master Operator Tool System (v2)

Production-grade function-calling for the admin AI operator.

## Source of truth

| File | Role |
|------|------|
| `lib/admin/copilot/master-tools.json` | Tool names, parameters, API hints, preview/destructive flags |
| `lib/admin/copilot/tool-registry.ts` | Gemini declarations, aliases, catalog for prompt |
| `lib/admin/copilot/operator-handlers.ts` | Execution layer → Supabase + admin APIs |
| `lib/admin/copilot/preview.ts` | Preview / confirm contract |
| `lib/admin/copilot/memory.ts` | Brand tone, colors, page drafts |
| `lib/admin/copilot/system-prompt.ts` | Operator principles + tool catalog in system prompt |

## API mapping

| Tool | Backend |
|------|---------|
| `add_product` | `POST /api/admin/products` |
| `edit_product` | `PATCH /api/admin/products` |
| `delete_product` | `DELETE /api/admin/products` |
| `list_products` | `GET /api/admin/products` |
| `manage_orders` | Orders table + `update_order_status` |
| `manage_users` | `GET /api/admin/customers` |
| `remember_brand_preference` | `PATCH /api/admin/copilot/memory` |
| CMS tools (`update_page_*`, `add_section`, …) | Drafts in `copilot_operator_memory` until Sanity builder ships |

## Preview mode

Write tools with `previewDefault: true` return `dry_run: true` until the model re-calls with `confirm: true`.

## Memory

Run migration `supabase/migrations/0028_copilot_operator_memory.sql`, then memory persists per admin Clerk ID.

## Legacy aliases

`create_product` → `add_product`, `update_product` → `edit_product`, `search_products` → `list_products`.
