-- ============================================================
-- REFUTO LA FERME URBAINE — Supabase Database Schema
-- Version intégrée: tables + sécurité RLS + helpers + polling stable
-- Paste this entire file into Supabase > SQL Editor > Run for a NEW project.
-- If your database already exists, do NOT rerun the whole file; use the migration file instead.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- SHARED HELPERS
-- ============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- These functions avoid recursive RLS bugs when policies need to check the current user's role.
-- They must be SECURITY DEFINER so policies can safely read public.users.
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.is_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'employee', false);
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'client', false);
$$;

-- ============================================================
-- USERS
-- ============================================================

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  address text,
  role text not null check (role in ('admin','employee','client')),
  avatar text default '🌿',
  hourly_rate numeric(8,2) check (hourly_rate is null or hourly_rate >= 0),
  position text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists users_auth_id_unique on public.users(auth_id);
create index if not exists users_role_idx on public.users(role);

alter table public.users enable row level security;

-- ============================================================
-- INVENTORY
-- ============================================================

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  unit text not null,
  stock integer not null default 0 check (stock >= 0),
  available boolean not null default true,
  emoji text default '🌱',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists inventory_available_idx on public.inventory(available);
create index if not exists inventory_category_idx on public.inventory(category);

alter table public.inventory enable row level security;

drop trigger if exists inventory_updated_at on public.inventory;
create trigger inventory_updated_at
  before update on public.inventory
  for each row execute function public.update_updated_at();

-- ============================================================
-- ORDERS
-- ============================================================

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete set null,
  client_name text not null,
  client_email text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'nouveau'
    check (status in ('nouveau','préparation','livré','annulé')),
  pay_method text not null default 'carte'
    check (pay_method in ('carte','comptant')),
  pay_status text not null default 'en attente'
    check (pay_status in ('payé','en attente','remboursé')),
  delivery_note text,
  invoice_sent boolean default false,
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_pay_status_idx on public.orders(pay_status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.orders enable row level security;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();

-- ============================================================
-- PUNCH RECORDS
-- ============================================================

create table if not exists public.punch_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  user_name text not null,
  punch_in timestamptz not null,
  punch_out timestamptz,
  hours numeric(6,2) default 0 check (hours is null or hours >= 0),
  note text,
  manual_entry boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint punch_out_after_in check (punch_out is null or punch_out >= punch_in)
);

create index if not exists punch_records_user_id_idx on public.punch_records(user_id);
create index if not exists punch_records_punch_in_idx on public.punch_records(punch_in desc);

alter table public.punch_records enable row level security;

drop trigger if exists punches_updated_at on public.punch_records;
create trigger punches_updated_at
  before update on public.punch_records
  for each row execute function public.update_updated_at();

-- ============================================================
-- TASKS
-- ============================================================

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  assignee_id uuid references public.users(id) on delete set null,
  assignee_name text,
  priority text not null default 'normale'
    check (priority in ('haute','normale','basse')),
  status text not null default 'à faire'
    check (status in ('à faire','en cours','terminé')),
  due_date date,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_priority_idx on public.tasks(priority);

alter table public.tasks enable row level security;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  plan text not null,
  price numeric(10,2) check (price is null or price >= 0),
  frequency text not null default 'hebdomadaire'
    check (frequency in ('hebdomadaire','bimensuel','mensuel')),
  pay_method text not null default 'carte'
    check (pay_method in ('carte','comptant')),
  status text not null default 'actif'
    check (status in ('actif','inactif','annulé')),
  start_date date not null default current_date,
  next_delivery date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

alter table public.subscriptions enable row level security;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();

-- ============================================================
-- EMAILS LOG
-- ============================================================

create table if not exists public.emails_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  subject text not null,
  recipient text not null,
  body text,
  status text not null default 'envoyé'
    check (status in ('envoyé','échec','brouillon','queued')),
  provider_message_id text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists emails_log_sent_at_idx on public.emails_log(sent_at desc);
create index if not exists emails_log_type_idx on public.emails_log(type);

alter table public.emails_log enable row level security;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Drop old policies safely before recreating.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users','inventory','orders','punch_records','tasks','subscriptions','emails_log')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- USERS
create policy "users read own or admin"
  on public.users for select
  using (auth_id = auth.uid() or public.is_admin());

create policy "users admin insert"
  on public.users for insert
  with check (public.is_admin());

create policy "users admin update"
  on public.users for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "users admin delete"
  on public.users for delete
  using (public.is_admin());

-- INVENTORY
-- Admin/employee can see all inventory. Clients can only see available items.
create policy "inventory read by role"
  on public.inventory for select
  using (
    public.is_admin()
    or public.is_employee()
    or (public.is_client() and available = true)
  );

create policy "inventory admin insert"
  on public.inventory for insert
  with check (public.is_admin());

create policy "inventory admin update"
  on public.inventory for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "inventory admin delete"
  on public.inventory for delete
  using (public.is_admin());

-- ORDERS
create policy "orders read own or admin"
  on public.orders for select
  using (public.is_admin() or client_id = public.current_app_user_id());

create policy "orders client insert own"
  on public.orders for insert
  with check (
    public.is_admin()
    or (
      public.is_client()
      and client_id = public.current_app_user_id()
      and status = 'nouveau'
      and pay_status = 'en attente'
      and invoice_sent = false
    )
  );

create policy "orders admin update"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "orders admin delete"
  on public.orders for delete
  using (public.is_admin());

-- PUNCH RECORDS
create policy "punch read own or admin"
  on public.punch_records for select
  using (public.is_admin() or user_id = public.current_app_user_id());

create policy "punch employee insert own or admin"
  on public.punch_records for insert
  with check (
    public.is_admin()
    or (public.is_employee() and user_id = public.current_app_user_id())
  );

create policy "punch employee update own or admin"
  on public.punch_records for update
  using (public.is_admin() or (public.is_employee() and user_id = public.current_app_user_id()))
  with check (public.is_admin() or (public.is_employee() and user_id = public.current_app_user_id()));

create policy "punch admin delete"
  on public.punch_records for delete
  using (public.is_admin());

-- TASKS
create policy "tasks read assigned or admin"
  on public.tasks for select
  using (public.is_admin() or assignee_id = public.current_app_user_id());

create policy "tasks admin insert"
  on public.tasks for insert
  with check (public.is_admin());

create policy "tasks update assigned or admin"
  on public.tasks for update
  using (public.is_admin() or (public.is_employee() and assignee_id = public.current_app_user_id()))
  with check (public.is_admin() or (public.is_employee() and assignee_id = public.current_app_user_id()));

create policy "tasks admin delete"
  on public.tasks for delete
  using (public.is_admin());

-- SUBSCRIPTIONS
create policy "subscriptions read own or admin"
  on public.subscriptions for select
  using (public.is_admin() or client_id = public.current_app_user_id());

create policy "subscriptions admin insert"
  on public.subscriptions for insert
  with check (public.is_admin());

create policy "subscriptions admin update"
  on public.subscriptions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "subscriptions admin delete"
  on public.subscriptions for delete
  using (public.is_admin());

-- EMAILS LOG
create policy "emails admin select"
  on public.emails_log for select
  using (public.is_admin());

create policy "emails admin insert"
  on public.emails_log for insert
  with check (public.is_admin());

create policy "emails admin update"
  on public.emails_log for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "emails admin delete"
  on public.emails_log for delete
  using (public.is_admin());

-- ============================================================
-- REALTIME COMPATIBILITY SETTINGS
-- ============================================================
-- Your current React app should keep VITE_ENABLE_REALTIME=false because polling is stable.
-- These settings are harmless and prepare the tables if you decide to test realtime later.

alter table public.orders replica identity full;
alter table public.inventory replica identity full;
alter table public.punch_records replica identity full;
alter table public.tasks replica identity full;
alter table public.subscriptions replica identity full;
alter table public.users replica identity full;
alter table public.emails_log replica identity full;

-- Do not force-drop/create the supabase_realtime publication here.
-- Supabase manages it differently across projects, and forcing it caused issues in your previous setup.

-- ============================================================
-- SEED INVENTORY
-- ============================================================
insert into public.inventory (name, category, price, unit, stock, available, emoji, description)
select * from (values
  ('Tomates cerises',   'Légumes',  4.50::numeric, '250g',   40, true,  '🍅', 'Cultivées sous serre'),
  ('Laitue Boston',     'Légumes',  3.00::numeric, 'tête',   25, true,  '🥬', 'Fraîche du matin'),
  ('Fraises',           'Fruits',   6.00::numeric, '500g',   18, true,  '🍓', 'Variété Chandler'),
  ('Carottes',          'Légumes',  2.50::numeric, 'botte',  30, true,  '🥕', 'Biologiques'),
  ('Poulet fermier',    'Viande',  22.00::numeric, 'kg',      8, true,  '🍗', 'Élevage plein air'),
  ('Concombres',        'Légumes',  2.00::numeric, 'pièce',  50, true,  '🥒', 'Long anglais'),
  ('Miel artisanal',    'Épicerie',12.00::numeric, '250ml',  15, true,  '🍯', 'Ruches de la ferme'),
  ('Courge butternut',  'Légumes',  5.00::numeric, 'pièce',   0, false, '🎃', 'Disponible à l''automne')
) as seed(name, category, price, unit, stock, available, emoji, description)
where not exists (select 1 from public.inventory);

-- ============================================================
-- DONE — your database is ready.
-- Next: create your first admin user in Supabase Authentication,
-- then insert their profile into public.users from the SQL Editor.
-- ============================================================
