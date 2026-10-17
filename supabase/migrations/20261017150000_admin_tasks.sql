-- The admin's own to-do list for the app (AdminTasksTab). Admins only.
create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 300),
  notes text check (length(notes) <= 4000),
  priority smallint not null default 2 check (priority between 1 and 3), -- 1 high, 2 normal, 3 low
  done_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

alter table public.admin_tasks enable row level security;

create policy "admin_tasks_admin_all" on public.admin_tasks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
