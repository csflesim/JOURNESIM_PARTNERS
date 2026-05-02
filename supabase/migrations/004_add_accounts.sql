-- Admin roles
create table if not exists admin_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  created_at  timestamptz default now()
);

-- Admin accounts
create table if not exists admin_accounts (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  role_id    uuid references admin_roles(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

-- Role permissions: one row per permission key per role
create table if not exists admin_role_permissions (
  role_id        uuid not null references admin_roles(id) on delete cascade,
  permission_key text not null,
  enabled        boolean not null default true,
  primary key (role_id, permission_key)
);

-- Seed default roles
insert into admin_roles (name, description) values
  ('管理員', '管理'),
  ('運營',   'Operation'),
  ('客服',   '客服')
on conflict do nothing;
