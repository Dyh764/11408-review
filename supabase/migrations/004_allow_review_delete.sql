-- Allow users to delete their own pending review tasks. This supports the
-- "mastered" result, which lowers priority by removing future high-frequency
-- pending reviews for the same question.

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
on public.reviews for delete
to authenticated
using (auth.uid() = user_id);
