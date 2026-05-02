-- 億點國家資料
create table if not exists bc_countries (
  mcc         text primary key,
  name        text not null,
  continent   text,
  flag_url    text,
  synced_at   timestamptz default now()
);

-- 億點運營商資料
create table if not exists bc_operators (
  id           uuid primary key default gen_random_uuid(),
  mcc          text not null,
  country_name text,
  operator     text not null,
  network      text,
  priority     text,
  synced_at    timestamptz default now(),
  unique (mcc, operator, network)
);

create index if not exists idx_bc_operators_mcc on bc_operators(mcc);
