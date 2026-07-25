-- -----------------------------------------------------------------------------
-- Migration 0084: Force PostgREST schema cache reload
-- This ensures the newly added columns are recognized by the API
-- -----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
