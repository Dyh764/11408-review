-- Let users delete their own question images. This is needed so the client can
-- clean up an uploaded image if the matching questions insert fails.

drop policy if exists "question_images_delete_own" on storage.objects;
create policy "question_images_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);
