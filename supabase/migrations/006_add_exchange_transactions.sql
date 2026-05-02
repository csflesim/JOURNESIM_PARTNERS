create table if not exists exchange_transactions (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  description   text not null default '',
  type          text not null default 'exchange',
                -- 'initial'    初始金額（純到帳，無匯出）
                -- 'exchange'   換匯充值（from → to）
                -- 'settlement' 採購結算（純匯出，無到帳）
                -- 'other'      其他調整
  from_currency text,           -- 匯出幣別 (TWD / USD / HKD / CNY)
  from_amount   numeric(18,4),  -- 匯出金額 (正數)
  to_currency   text,           -- 到帳幣別
  to_amount     numeric(18,4),  -- 到帳金額 (正數)
  -- 匯率由前端/API 計算：to_amount / from_amount
  notes         text not null default '',
  created_at    timestamptz default now()
);

create index if not exists exchange_transactions_date_idx
  on exchange_transactions(date, created_at);
