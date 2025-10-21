insert into storage.buckets
  (id, name, public)
values
  ('recipe-photos', 'recipe-photos', TRUE),
  ('avatar-photos', 'avatar-photos', TRUE);

-- Insert a test user
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'test@example.com', crypt('testpassword123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');