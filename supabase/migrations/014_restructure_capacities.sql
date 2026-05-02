-- 刪除舊的流量表，改用更精確的兩張表
drop table if exists bc_capacities;

-- 每日高速流量參數表（對應 F002 highFlowSize，單位 KB）
create table if not exists bc_high_flow_sizes (
  high_flow_size  text primary key,
  label           text not null,
  sort_order      integer default 0,
  synced_at       timestamptz default now()
);

-- 降速速率參數表（對應 F002 limitFlowSpeed，單位 kbps）
create table if not exists bc_speed_limits (
  limit_flow_speed  text primary key,
  label             text not null,
  sort_order        integer default 0,
  synced_at         timestamptz default now()
);

create index if not exists idx_bc_high_flow_sizes_sort on bc_high_flow_sizes(sort_order);
create index if not exists idx_bc_speed_limits_sort on bc_speed_limits(sort_order);
