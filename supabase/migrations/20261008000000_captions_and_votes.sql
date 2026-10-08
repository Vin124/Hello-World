-- Photos users upload, the AI captions generated for them, and votes on captions.
--
-- Write model:
--   images, captions -> written only by the server (service role) after it has
--                       called the AI, so nobody can post "AI" captions by hand.
--                       No insert/update/delete policies for clients.
--   votes            -> written by users with their own session; RLS limits each
--                       user to their own rows.
--   captions.score   -> maintained by a trigger on votes, so totals are public
--                       while individual votes stay private.

create table public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index images_user_id_created_at_idx on public.images (user_id, created_at desc);
create index images_created_at_idx on public.images (created_at desc);

alter table public.images enable row level security;

create policy "Anyone can view images"
  on public.images for select
  to anon, authenticated
  using (true);

create table public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images (id) on delete cascade,
  body text not null,
  prompt text not null,
  model text not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  constraint body_length check (char_length(body) between 1 and 300)
);

create index captions_image_id_idx on public.captions (image_id);
create index captions_created_at_score_idx on public.captions (created_at desc, score desc);

alter table public.captions enable row level security;

create policy "Anyone can view captions"
  on public.captions for select
  to anon, authenticated
  using (true);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value smallint not null,
  created_at timestamptz not null default now(),
  constraint value_is_up_or_down check (value in (-1, 1)),
  constraint one_vote_per_user unique (user_id, caption_id)
);

create index votes_caption_id_idx on public.votes (caption_id);

alter table public.votes enable row level security;

create policy "Users can view their own votes"
  on public.votes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can cast their own votes"
  on public.votes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own votes"
  on public.votes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own votes"
  on public.votes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keeps captions.score equal to the sum of its votes. Security definer because
-- voters have no update rights on captions.
create function public.apply_vote_to_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.captions set score = score - old.value where id = old.caption_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.captions set score = score + new.value where id = new.caption_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.apply_vote_to_score() from public, anon, authenticated;

create trigger on_vote_change
  after insert or update or delete on public.votes
  for each row execute function public.apply_vote_to_score();

-- Photos: public-read bucket; users may only upload inside a folder named
-- after their own user id. The server checks that prefix before captioning.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 4194304, array['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

create policy "Users can upload their own photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
