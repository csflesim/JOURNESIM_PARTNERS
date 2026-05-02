-- agent_products: 從單一 sell_price 改為 sell_prices jsonb
-- 格式: [{"copies":"1","price":63},{"copies":"3","price":150}]

ALTER TABLE agent_products ADD COLUMN IF NOT EXISTS sell_prices jsonb NOT NULL DEFAULT '[]';

-- 搬移舊資料：把 sell_price 轉成 copies=1 的 sell_prices
UPDATE agent_products
SET sell_prices = jsonb_build_array(jsonb_build_object('copies', '1', 'price', sell_price))
WHERE sell_prices = '[]' AND sell_price IS NOT NULL AND sell_price > 0;

-- 移除舊欄位的 NOT NULL（保留欄位作向下相容）
ALTER TABLE agent_products ALTER COLUMN sell_price DROP NOT NULL;
ALTER TABLE agent_products ALTER COLUMN sell_price SET DEFAULT 0;
