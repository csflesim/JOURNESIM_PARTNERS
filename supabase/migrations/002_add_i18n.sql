ㄩ-- 多語言名稱與描述（BC API language 2=EN, 3=JA, 4=KO）
alter table products add column if not exists name_i18n jsonb default '{}';
alter table products add column if not exists desc_i18n jsonb default '{}';
