-- Migrate exchange_transactions from old schema to new from/to schema

alter table exchange_transactions
  add column if not exists from_currency text,
  add column if not exists from_amount   numeric(18,4),
  add column if not exists to_currency   text,
  add column if not exists to_amount     numeric(18,4);

-- Backfill existing rows from old columns (only if legacy columns still exist)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'exchange_transactions' and column_name = 'source_currency'
  ) then
    execute $sql$
      update exchange_transactions set
        from_currency = source_currency,
        from_amount   = source_amount,
        to_currency   = 'CNY',
        to_amount     = case when cny_amount > 0 then cny_amount else null end
      where source_currency is not null and cny_amount > 0;

      update exchange_transactions set
        from_currency = 'CNY',
        from_amount   = abs(cny_amount)
      where cny_amount < 0 and source_currency is null and from_currency is null;

      update exchange_transactions set
        to_currency = 'CNY',
        to_amount   = cny_amount
      where cny_amount > 0 and source_currency is null and to_currency is null;
    $sql$;
  end if;
end $$;

-- Drop old columns
alter table exchange_transactions
  drop column if exists source_currency,
  drop column if exists source_amount,
  drop column if exists exchange_rate,
  drop column if exists cny_amount;
