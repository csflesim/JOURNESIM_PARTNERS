-- 補齊 F002 所有回傳欄位

-- 產品基本資訊
alter table products add column if not exists product_id                   text;
alter table products add column if not exists product_name                 text;

-- 有效期相關
alter table products add column if not exists validity_period              text;
alter table products add column if not exists carrier_validity_period      text;

-- 日切點
alter table products add column if not exists point_contact_hours          text;

-- 預計出行時間
alter table products add column if not exists estimated_use_time_flag      text;
-- 1-必須填寫 2-無需填寫
alter table products add column if not exists estimated_use_time_gap_hours text;

-- 適用載體（apply_to_device 在 migration 001 已存在，補 type）
alter table products add column if not exists apply_to_device_type         jsonb default '[]';

-- 商業資訊
alter table products add column if not exists provider                     text;
alter table products add column if not exists refund_policy                text;
alter table products add column if not exists speed_limit_rule             text;

comment on column products.product_id                   is 'F002 productId — 產品id';
comment on column products.product_name                 is 'F002 productName — 產品名稱';
comment on column products.validity_period              is 'F002 validityPeroid — 到期時間';
comment on column products.carrier_validity_period      is 'F002 carrierValidityPeroid — 載體默認有效期';
comment on column products.point_contact_hours          is 'F002 pointContactHours — 日切點時間';
comment on column products.estimated_use_time_flag      is 'F002 estimatedUseTimeFlag — 1:必須填寫 2:無需填寫';
comment on column products.estimated_use_time_gap_hours is 'F002 estimatedUseTimeGapHours — 預計出行處理間隙時間';
comment on column products.apply_to_device_type         is 'F002 applyToDeviceType — 適用載體類型 Array';
comment on column products.provider                     is 'F002 provider — 供應商';
comment on column products.refund_policy                is 'F002 refundPolicy — 退款政策';
comment on column products.speed_limit_rule             is 'F002 speedLimitRule — 限速規則';
