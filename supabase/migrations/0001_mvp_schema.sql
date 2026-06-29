create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique not null,
  full_name text not null,
  email text,
  department text,
  designation text,
  company_id uuid references public.companies(id),
  reporting_manager_id uuid references public.employees(id),
  mobile_number text,
  aadhar_number text,
  date_of_joining date,
  resigned_at date,
  last_working_date date,
  status text not null default 'active' check (status in ('active', 'resigned', 'inactive', 'on_leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'hardware',
  fields jsonb not null default '[]'::jsonb,
  is_other_asset boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique not null,
  name text,
  asset_type_id uuid references public.asset_types(id),
  company_id uuid references public.companies(id),
  asset_status text not null default 'available' check (asset_status in ('available', 'assigned', 'maintenance', 'decommissioned')),
  location text not null default 'IT Room',
  warranty_expiry date,
  tech_specs jsonb not null default '{}'::jsonb,
  documents text[] not null default '{}',
  is_other_asset boolean not null default false,
  assigned_to uuid references public.employees(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  status text not null default 'active' check (status in ('active', 'returned')),
  location text,
  remarks text
);

create table if not exists public.asset_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  action text not null,
  assigned_to uuid references public.employees(id),
  assigned_by uuid references public.profiles(id),
  location text,
  remarks text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid references public.employees(id),
  subject text not null,
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_otps (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid references public.employees(id),
  otp_hash text not null,
  verified boolean not null default false,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists employees_company_id_idx on public.employees(company_id);
create index if not exists assets_type_id_idx on public.assets(asset_type_id);
create index if not exists assets_assigned_to_idx on public.assets(assigned_to);
create index if not exists tickets_asset_id_idx on public.tickets(asset_id);
create index if not exists ticket_otps_asset_id_idx on public.ticket_otps(asset_id);

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.asset_types enable row level security;
alter table public.assets enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.asset_logs enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_otps enable row level security;
