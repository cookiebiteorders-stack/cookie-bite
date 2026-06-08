-- Point new-customer welcome to prelaunch template (library sync creates HTML rows).
INSERT INTO public.email_event_template_mappings (event_name, template_key, is_active)
VALUES ('user_registered', 'welcome-prelaunch', true)
ON CONFLICT (event_name) DO UPDATE
SET template_key = EXCLUDED.template_key,
    updated_at = timezone('utc', now());
