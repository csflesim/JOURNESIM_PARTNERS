-- 代理商商品管理：每個代理商可販售的商品及其自訂售價
CREATE TABLE agent_products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  sku_id      text NOT NULL,                        -- 對應 products.sku_id
  sell_price  numeric(10,2) NOT NULL,               -- 代理商售價
  is_active   boolean NOT NULL DEFAULT true,        -- 是否啟用
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, sku_id)
);

CREATE INDEX idx_agent_products_agent ON agent_products (agent_id);
CREATE INDEX idx_agent_products_sku   ON agent_products (sku_id);

ALTER TABLE agent_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON agent_products
  FOR ALL USING (auth.role() = 'service_role');
