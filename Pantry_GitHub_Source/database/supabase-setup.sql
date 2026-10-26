-- Run once in the SQL editor of a NEW Supabase project for Pantry.
-- This standalone setup script is not a Supabase CLI migration.
create table if not exists public.pantry_workspaces (
 owner_id text primary key,
 revision bigint not null default 0 check (revision >= 0),
 document text not null check (octet_length(document) <= 2000000),
 updated_at timestamptz not null default now()
);
alter table public.pantry_workspaces enable row level security;
revoke all on table public.pantry_workspaces from anon, authenticated;
grant select, insert, update on table public.pantry_workspaces to service_role;
-- There are no public RLS policies. The signed-session server authorizes access,
-- then the server-only secret key accesses this table.
