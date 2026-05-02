-- 代理商帳號
create table if not exists agents (
  id                  uuid primary key default gen_random_uuid(),
  avatar_url          text,
  nickname            text not null,
  phone               text not null default '',
  email               text not null unique,
  password_hash       text not null default '',
  account_type        text not null default 'travel_agent',
                      -- 'travel_agent' 旅行從業人員 | 'company' 公司
  verification_status text not null default 'pending',
                      -- 'pending' 未審核 | 'reviewing' 審核中 | 'approved' 審核通過 | 'rejected' 審核拒絕
  account_status      text not null default 'active',
                      -- 'active' 正常 | 'suspended' 停用 | 'cancelled' 註銷
  referrer_id         uuid references agents(id) on delete set null,
  balance             numeric(18,4) not null default 0,
  note                text not null default '',
  created_at          timestamptz default now()
);

-- 代理商認證資料（每人一筆）
create table if not exists agent_verifications (
  agent_id                uuid primary key references agents(id) on delete cascade,

  -- 旅行從業人員 (account_type = 'travel_agent')
  tv_name                 text,
  tv_gender               text,                 -- 'male' | 'female' | 'other'
  tv_id_card_front_url    text,
  tv_license_url          text,

  -- 公司 (account_type = 'company')
  co_company_name         text,
  co_tax_id               text,                 -- 統一編號
  co_address              text,
  co_website              text,
  co_owner_name           text,
  co_owner_title          text,                 -- 負責人稱謂
  co_owner_id_number      text,
  co_contact_name         text,
  co_contact_title        text,                 -- 聯繫人稱謂
  co_contact_department   text,
  co_contact_position     text,
  co_contact_phone        text,
  co_business_license_url text,
  co_travel_permit_url    text,

  updated_at timestamptz default now()
);

-- 代理商 API 憑證（每人一組，可重新產生）
create table if not exists agent_api_keys (
  agent_id    uuid primary key references agents(id) on delete cascade,
  app_key     text not null unique default encode(gen_random_bytes(12), 'hex'),
  app_secret  text not null default encode(gen_random_bytes(24), 'hex'),
  created_at  timestamptz default now()
);

-- 預存款充值紀錄
create table if not exists agent_topup_logs (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references agents(id) on delete cascade,
  amount      numeric(18,4) not null,
  note        text not null default '',
  operated_by text not null default '',
  created_at  timestamptz default now()
);
