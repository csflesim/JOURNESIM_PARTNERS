create table if not exists exchange_rates (
  currency    text primary key,      -- 'USD' | 'TWD' | 'HKD' | 'CNY'
  rate        numeric(12, 6) not null default 1,  -- 1 currency unit = ? CNY
  updated_at  timestamptz default now(),
  updated_by  text not null default ''
);

-- CNY is the base (rate = 1, read-only reference)
insert into exchange_rates (currency, rate) values
  ('CNY', 1),
  ('USD', 7.25),
  ('TWD', 0.22),
  ('HKD', 0.93)
on conflict (currency) do nothing;
