-- 代理商訂單：在 orders 表增加欄位來關聯代理商訂單與採購訂單
-- source = 'partner' 表示代理商下單，'admin' 表示後台直購

-- 關聯欄位：代理商訂單 ↔ 採購訂單互相指向
ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_order_id uuid REFERENCES orders(id);

-- 代理商售價（代理商訂單記錄代理商賣出的價格）
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS agent_sell_price numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_orders_partner_order ON orders (partner_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);
