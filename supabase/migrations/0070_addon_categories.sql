-- تصنيفات الإضافات: كل تصنيف له سجل addons واحد (الخيارات = عناصر الإضافة في options jsonb)

CREATE TABLE IF NOT EXISTS public.addon_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  selection_type TEXT NOT NULL DEFAULT 'single_choice'
    CHECK (selection_type IN ('single_choice', 'multiple_choice')),
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addon_categories_sort
  ON public.addon_categories(sort_order, name);

ALTER TABLE public.addons
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.addon_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_addons_category_id ON public.addons(category_id);

ALTER TABLE public.addon_categories ENABLE ROW LEVEL SECURITY;

-- ترحيل: تصنيف واحد لكل مجموعة addons موجودة
DO $$
DECLARE
  r RECORD;
  new_cat_id UUID;
  ord INT := 0;
BEGIN
  FOR r IN
    SELECT *
    FROM public.addons
    WHERE category_id IS NULL
    ORDER BY created_at NULLS LAST, name
  LOOP
    INSERT INTO public.addon_categories (
      name, description, selection_type, required, sort_order, created_at, updated_at
    )
    VALUES (
      r.name,
      r.description,
      r.type,
      r.required,
      ord,
      COALESCE(r.created_at, NOW()),
      COALESCE(r.updated_at, NOW())
    )
    RETURNING id INTO new_cat_id;

    UPDATE public.addons
    SET category_id = new_cat_id
    WHERE id = r.id;

    ord := ord + 1;
  END LOOP;
END $$;

-- تصنيفات بدون حاوية addons (احتياط)
INSERT INTO public.addons (name, description, type, required, options, category_id)
SELECT
  c.name,
  c.description,
  c.selection_type,
  c.required,
  '[]'::jsonb,
  c.id
FROM public.addon_categories c
WHERE NOT EXISTS (SELECT 1 FROM public.addons a WHERE a.category_id = c.id);
