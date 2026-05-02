-- 主訂單
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null default 'admin',
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

-- 子訂單
create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
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

-- eSIM 資料
create table if not exists esim_profiles (
  id                uuid primary key default gen_random_uuid(),
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

-- 售後單
create table if not exists after_sales (
  id                    uuid primary key default gen_random_uuid(),
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
  comment               text,
  status                text default 'pending',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_orders_channel_order_id on orders(channel_order_id);
create index if not exists idx_orders_agent_id on orders(agent_id);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_esim_profiles_iccid on esim_profiles(iccid);
