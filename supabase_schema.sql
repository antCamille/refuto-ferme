-- ============================================================
-- REFUTO LA FERME URBAINE — Supabase Database Schema
-- Paste this entire file into Supabase > SQL Editor > Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── USERS ────────────────────────────────────────────────────
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  address text,
  role text not null check (role in ('admin','employee','client')),
  avatar text default '🌿',
  hourly_rate numeric(8,2),
  position text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

-- Admin sees all, others see only themselves
create policy "Admin full access on users" on public.users
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "Users see own row" on public.users
  for select using (auth_id = auth.uid());

-- ── INVENTORY ────────────────────────────────────────────────
create table public.inventory (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  unit text not null,
  stock integer not null default 0,
  available boolean not null default true,
  emoji text default '🌱',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.inventory enable row level security;

create policy "Admin manages inventory" on public.inventory
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "All users can read available inventory" on public.inventory
  for select using (available = true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger inventory_updated_at
  before update on public.inventory
  for each row execute function update_updated_at();

-- ── ORDERS ───────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete set null,
  client_name text not null,
  client_email text not null,
  items jsonb not null default '[]',
  total numeric(10,2) not null,
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

alter table public.orders enable row level security;

create policy "Admin full access on orders" on public.orders
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "Clients see own orders" on public.orders
  for select using (
    client_id = (select id from public.users where auth_id = auth.uid())
  );
create policy "Clients create own orders" on public.orders
  for insert with check (
    client_id = (select id from public.users where auth_id = auth.uid())
  );

create trigger orders_updated_at
  before update on public.orders
  for each row execute function update_updated_at();

-- ── PUNCH RECORDS ─────────────────────────────────────────────
create table public.punch_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  user_name text not null,
  punch_in timestamptz not null,
  punch_out timestamptz,
  hours numeric(6,2) default 0,
  note text,
  manual_entry boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.punch_records enable row level security;

create policy "Admin full access on punches" on public.punch_records
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "Employees manage own punches" on public.punch_records
  for all using (
    user_id = (select id from public.users where auth_id = auth.uid())
  );

create trigger punches_updated_at
  before update on public.punch_records
  for each row execute function update_updated_at();

-- ── TASKS ────────────────────────────────────────────────────
create table public.tasks (
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

alter table public.tasks enable row level security;

create policy "Admin full access on tasks" on public.tasks
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "Employees see own tasks" on public.tasks
  for select using (
    assignee_id = (select id from public.users where auth_id = auth.uid())
  );

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function update_updated_at();

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  plan text not null,
  price numeric(10,2),
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

alter table public.subscriptions enable row level security;

create policy "Admin full access on subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );
create policy "Clients see own subscriptions" on public.subscriptions
  for select using (
    client_id = (select id from public.users where auth_id = auth.uid())
  );

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function update_updated_at();

-- ── EMAILS LOG ───────────────────────────────────────────────
create table public.emails_log (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  subject text not null,
  recipient text not null,
  body text,
  status text not null default 'envoyé',
  sent_at timestamptz default now()
);

alter table public.emails_log enable row level security;

create policy "Admin full access on emails" on public.emails_log
  for all using (
    exists (select 1 from public.users u where u.auth_id = auth.uid() and u.role = 'admin')
  );

-- ── SEED INVENTORY ───────────────────────────────────────────
insert into public.inventory (name, category, price, unit, stock, available, emoji, description) values
  ('Tomates cerises',   'Légumes',  4.50, '250g',   40, true,  '🍅', 'Cultivées sous serre'),
  ('Laitue Boston',     'Légumes',  3.00, 'tête',   25, true,  '🥬', 'Fraîche du matin'),
  ('Fraises',           'Fruits',   6.00, '500g',   18, true,  '🍓', 'Variété Chandler'),
  ('Carottes',          'Légumes',  2.50, 'botte',  30, true,  '🥕', 'Biologiques'),
  ('Poulet fermier',    'Viande',  22.00, 'kg',      8, true,  '🍗', 'Élevage plein air'),
  ('Concombres',        'Légumes',  2.00, 'pièce',  50, true,  '🥒', 'Long anglais'),
  ('Miel artisanal',    'Épicerie',12.00, '250ml',  15, true,  '🍯', 'Ruches de la ferme'),
  ('Courge butternut',  'Légumes',  5.00, 'pièce',   0, false, '🎃', 'Disponible à l''automne');

-- ============================================================
-- DONE — your database is ready!
-- Next: go to Supabase > Authentication > Users to create
-- your first admin account, then run the app.
-- ============================================================
