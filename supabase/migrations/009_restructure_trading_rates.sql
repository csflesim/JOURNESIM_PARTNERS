-- 交易匯率改為以台幣（TWD）為基準
-- rate 的意義：1 TWD = ? 外幣
-- 例：rate=0.220 → 1 TWD = 0.220 CNY → 1 CNY = 4.545 TWD

create table if not exists exchange_rates (
  currency    text primary key,
  rate        numeric(12, 6) not null default 1,
  updated_at  timestamptz default now(),
  updated_by  text not null default ''
);

-- 清除舊資料（若表已存在且有舊格式資料）
truncate table exchange_rates;

insert into exchange_rates (currency, rate, updated_by) values
  ('CNY', 0.2200, '系統預設'),   -- 1 TWD = 0.2200 CNY
  ('USD', 0.0310, '系統預設'),   -- 1 TWD = 0.0310 USD
  ('HKD', 0.2420, '系統預設')    -- 1 TWD = 0.2420 HKD
on conflict (currency) do update set rate = excluded.rate;

comment on table  exchange_rates              is '交易匯率：以台幣（TWD）為基準，人工設定，用於商品定價換算';
comment on column exchange_rates.rate         is '1 TWD = rate 單位的外幣';
comment on column exchange_rates.updated_by   is '最後修改人員';
