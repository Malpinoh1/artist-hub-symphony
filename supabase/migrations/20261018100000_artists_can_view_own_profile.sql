create policy "Artists can view their own profile"
on public.artists
for select
to authenticated
using (auth.uid() = id);