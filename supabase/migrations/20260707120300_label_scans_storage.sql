-- ---------------------------------------------------------------------------
-- Storage bucket for the desktop -> phone label-scan handoff
--
-- The desktop scan page lets a signed-in user use their phone as the camera:
-- the desktop mints a one-shot signed-upload token for an object in THIS bucket
-- (under its own user folder), shows it to the phone as a QR code, the phone
-- uploads the captured frame with that token (no login), and the desktop is
-- pinged over Realtime and downloads the image to continue the flow.
--
-- The bucket is PRIVATE. Access is per-user-folder: an authenticated user may
-- only read/write objects whose first path segment is their own uid
-- (`<uid>/<session>.jpg`). The phone's upload rides a signed-upload token, which
-- authorizes that single write on its own and does not depend on these policies;
-- the policies exist so the desktop can create the signed URL and download the
-- result, and so no user can reach another user's in-flight captures.
--
-- These are transient staging objects (a capture the user is about to confirm),
-- not durable user data - a scheduled cleanup of old objects can be added later.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('label-scans', 'label-scans', false)
on conflict (id) do nothing;

-- Read own folder (desktop downloads the frame the phone uploaded).
create policy "label-scans: read own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'label-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Create own object (desktop mints the signed-upload URL for its own path).
create policy "label-scans: write own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'label-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Remove own object (cleanup after the capture is consumed).
create policy "label-scans: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'label-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
