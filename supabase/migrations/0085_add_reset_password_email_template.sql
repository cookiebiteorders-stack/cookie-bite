-- Add reset password email template
-- This template is used for password reset emails sent via the password_reset event

insert into public.email_templates (key, name, category, subject, html_body, text_body, variables, language, is_active)
values
  (
    'reset_email',
    'Password Reset Email',
    'transactional',
    'Reset Your Password',
    '<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>',
    'Reset Password

Follow this link to reset the password for your user:
{{ .ConfirmationURL }}',
    '["ConfirmationURL"]'::jsonb,
    'en',
    true
  ),
  (
    'reset_email',
    'Password Reset Email (Arabic)',
    'transactional',
    'إعادة تعيين كلمة المرور',
    '<h2>إعادة تعيين كلمة المرور</h2>

<p>اتبع هذا الرابط لإعادة تعيين كلمة المرور الخاصة بك:</p>
<p><a href="{{ .ConfirmationURL }}">إعادة تعيين كلمة المرور</a></p>',
    'إعادة تعيين كلمة المرور

اتبع هذا الرابط لإعادة تعيين كلمة المرور الخاصة بك:
{{ .ConfirmationURL }}',
    '["ConfirmationURL"]'::jsonb,
    'ar',
    true
  )
on conflict (key, language) do update
set
  name = excluded.name,
  subject = excluded.subject,
  html_body = excluded.html_body,
  text_body = excluded.text_body,
  variables = excluded.variables,
  is_active = excluded.is_active,
  updated_at = now();
