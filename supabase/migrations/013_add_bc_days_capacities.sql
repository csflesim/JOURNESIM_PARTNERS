-- 天數參數表（從商品提取）
create table if not exists bc_days (
  days        text primary key,
  label       text not null,
  sort_order  integer default 0,
  synced_at   timestamptz default now()
);

-- 流量參數表（從商品提取）
create table if not exists bc_capacities (
  capacity    text primary key,
  label       text not null,
  sort_order  integer default 0,
  synced_at   timestamptz default now()
);

create index if not exists idx_bc_days_sort on bc_days(sort_order);
create index if not exists idx_bc_capacities_sort on bc_capacities(sort_order);
