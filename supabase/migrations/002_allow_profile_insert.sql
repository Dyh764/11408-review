-- Allow authenticated users to create their own profile if the auth trigger
-- did not run or the profile was missing during local development.

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);
