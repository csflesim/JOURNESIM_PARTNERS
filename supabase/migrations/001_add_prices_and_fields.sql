-- 新增 prices 欄位（儲存所有天數/份數的結算價）
alter table products add column if not exists prices jsonb default '[]';

-- 新增缺少的欄位
alter table products add column if not exists acceleration_support text default '0';
-- 0-不支持 1-支持SIM 2-支持eSIM 3-支持全部 4-eSIM Air

alter table products add column if not exists apply_to_device text;
-- 適用載體

alter table products add column if not exists point_contact_type text;
-- 日切點類型 0-24小時制 1-日結制

alter table products add column if not exists time_zone text;
-- 運營商時區

alter table products add column if not exists usage_count text;
-- 設備可用次數 1-單次 2-多次
