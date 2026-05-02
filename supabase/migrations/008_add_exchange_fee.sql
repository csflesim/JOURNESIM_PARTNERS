alter table exchange_transactions
  add column if not exists from_fee numeric(18,4) not null default 0;
