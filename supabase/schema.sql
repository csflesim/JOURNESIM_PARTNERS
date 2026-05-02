-- =====================================================
-- FLESIM 資料庫 Schema
-- =====================================================

-- 啟用 UUID 擴充
create extension if not exists "uuid-ossp";

-- =====================================================
-- 商品表（從 BillionConnect 同步）
-- =====================================================
create table if not exists products (
  id            uuid primary key default uuid_generate_v4(),
  sku_id        text not null unique,
  name          text not null,
  type          text not null,
  days          text,
  capacity      text,
  high_flow_size text,
  limit_flow_speed text,
  hotspot_support text default '0',
  plan_type     text,
  countries     jsonb default '[]',
  operator_info jsonb default '[]',
  apn           text,
  desc_text     text,
  rechargeable_product text default '0',
  rechargeable_series_id text,
  rechargeable_series_name text,
  cost_price    numeric(10,2),
  retail_price  numeric(10,2),
  is_active     boolean default true,
  synced_at     timestamptz default now(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- =====================================================
-- 代理商表
-- =====================================================
create table if not exists agents (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text unique not null,
  phone         text,
  app_key       text unique not null default uuid_generate_v4()::text,
  app_secret    text not null,
  webhook_url   text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists agent_balances (
  id            uuid primary key default uuid_generate_v4(),
  agent_id      uuid references agents(id) on delete cascade,
  balance       numeric(12,2) default 0,
  currency      text default 'TWD',
  updated_at    timestamptz default now()
);

create table if not exists agent_prices (
  id            uuid primary key default uuid_generate_v4(),
  agent_id      uuid references agents(id) on delete cascade,
  sku_id        text references products(sku_id) on delete cascade,
  price         numeric(10,2) not null,
  created_at    timestamptz default now(),
  unique(agent_id, sku_id)
);

-- =====================================================
-- 訂單主表
-- =====================================================
create table if not exists orders (
  id                  uuid primary key default uuid_generate_v4(),
  source              text not null,
  agent_id            uuid references agents(id),
  user_email          text,
  channel_order_id    text unique not null,
  bc_order_id         text,
  order_type          text not null,
  total_amount        numeric(10,2),
  discount_amount     numeric(10,2) default 0,
  payment_method      text,
  payment_status      text default 'pending',
  tappay_rec_trade_id text,
  order_status        text default 'pending',
  estimated_use_time  date,
  comment             text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- =====================================================
-- 子訂單表
-- =====================================================
create table if not exists order_items (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid references orders(id) on delete cascade,
  channel_sub_order_id  text unique not null,
  bc_sub_order_id       text,
  sku_id                text references products(sku_id),
  copies                integer default 1,
  number                integer default 1,
  unit_price            numeric(10,2),
  iccid                 text[],
  plan_status           text,
  plan_start_time       timestamptz,
  plan_end_time         timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- =====================================================
-- eSIM 資料（N009 寫入）
-- =====================================================
create table if not exists esim_profiles (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid references orders(id),
  order_item_id     uuid references order_items(id),
  bc_sub_order_id   text,
  iccid             text not null,
  uid               text,
  qr_code_content   text,
  confirmation_code text,
  apn               text,
  apn_username      text,
  apn_password      text,
  pin               text,
  puk               text,
  msisdn            text,
  valid_time        timestamptz,
  profile_status    integer default 0,
  rechargeable_esim text default '0',
  email_sent        boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- =====================================================
-- 售後單
-- =====================================================
create table if not exists after_sales (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid references orders(id),
  channel_order_id      text not null,
  channel_sub_order_id  text,
  bc_after_sale_id      text,
  iccid                 text[],
  reason                text,
  refund_type           text,
  refund_amount         numeric(10,2),
  unsubscribe_flow      text default '0',
  receiving_state       text,
  return_card_or_not    text default '0',
  logistics_id          text,
  audit_status          text default '0',
  audit_opinion         text,
  refund_status         text default '0',
  refund_opinion        text,
  comment               text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- =====================================================
-- Webhook 日誌（幂等處理）
-- =====================================================
create table if not exists webhook_logs (
  id            uuid primary key default uuid_generate_v4(),
  trade_type    text not null,
  trade_time    text,
  payload       jsonb not null,
  processed     boolean default false,
  error_msg     text,
  received_at   timestamptz default now()
);

-- =====================================================
-- 公告
-- =====================================================
create table if not exists announcements (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null,
  title         text not null,
  content       text not null,
  is_active     boolean default true,
  published_at  timestamptz default now(),
  created_at    timestamptz default now()
);

-- =====================================================
-- 索引（IF NOT EXISTS 避免重複）
-- =====================================================
create index if not exists idx_orders_channel_order_id on orders(channel_order_id);
create index if not exists idx_orders_bc_order_id on orders(bc_order_id);
create index if not exists idx_orders_agent_id on orders(agent_id);
create index if not exists idx_orders_source on orders(source);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_iccid on order_items using gin(iccid);
create index if not exists idx_esim_profiles_iccid on esim_profiles(iccid);
create index if not exists idx_esim_profiles_order_id on esim_profiles(order_id);
create index if not exists idx_webhook_logs_trade_type on webhook_logs(trade_type);
create index if not exists idx_webhook_logs_processed on webhook_logs(processed);
create index if not exists idx_products_sku_id on products(sku_id);
create index if not exists idx_products_type on products(type);
