-- Passport photos for members (T-006). A PRIVATE Storage bucket: all access is
-- server-mediated — the service role writes, and reads use short-lived signed
-- URLs generated on the server. We deliberately add NO policies on
-- storage.objects: RLS there denies by default, so nothing but the service role
-- can touch these objects, which is exactly the intent for PII photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-photos',
  'member-photos',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
