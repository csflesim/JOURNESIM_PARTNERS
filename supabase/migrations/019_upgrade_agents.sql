-- =====================================================
-- 升級 agents 表：從 schema.sql 舊結構 → 010 新結構
-- =====================================================

-- 1. 補上缺少的欄位
ALTER TABLE agents ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'travel_agent';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance numeric(18,4) NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

-- 2. 將舊 name 複製到 nickname（如有資料）
UPDATE agents SET nickname = name WHERE nickname IS NULL AND name IS NOT NULL;
-- 確保 nickname 非 null
UPDATE agents SET nickname = email WHERE nickname IS NULL;
ALTER TABLE agents ALTER COLUMN nickname SET NOT NULL;

-- 3. 從舊 agent_balances 搬移餘額（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_balances') THEN
    UPDATE agents a SET balance = COALESCE(
      (SELECT ab.balance FROM agent_balances ab WHERE ab.agent_id = a.id LIMIT 1), 0
    );
  END IF;
END $$;

-- 4. 從舊 is_active 轉成 account_status
UPDATE agents SET account_status = CASE
  WHEN is_active = false THEN 'suspended'
  ELSE 'active'
END WHERE account_status = 'active' AND is_active = false;

-- 5. 建立缺少的關聯表
CREATE TABLE IF NOT EXISTS agent_verifications (
  agent_id                uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  tv_name                 text,
  tv_gender               text,
  tv_id_card_front_url    text,
  tv_license_url          text,
  co_company_name         text,
  co_tax_id               text,
  co_address              text,
  co_website              text,
  co_owner_name           text,
  co_owner_title          text,
  co_owner_id_number      text,
  co_contact_name         text,
  co_contact_title        text,
  co_contact_department   text,
  co_contact_position     text,
  co_contact_phone        text,
  co_business_license_url text,
  co_travel_permit_url    text,
  updated_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_api_keys (
  agent_id    uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  app_key     text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  app_secret  text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_topup_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount      numeric(18,4) NOT NULL,
  note        text NOT NULL DEFAULT '',
  operated_by text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

-- 6. 為已有的代理商建立 api_keys（從舊 app_key/app_secret 欄位搬移）
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'app_key'
  ) THEN
    INSERT INTO agent_api_keys (agent_id, app_key, app_secret)
    SELECT id, app_key, COALESCE(app_secret, encode(gen_random_bytes(24), 'hex'))
    FROM agents
    WHERE app_key IS NOT NULL
    ON CONFLICT (agent_id) DO NOTHING;
  END IF;
END $$;

-- 7. 為已有的代理商建立空的認證資料
INSERT INTO agent_verifications (agent_id)
SELECT id FROM agents
ON CONFLICT (agent_id) DO NOTHING;

-- 8. 處理舊欄位：移除 NOT NULL，已搬移到新結構不再使用
DO $$ BEGIN
  -- name → 已搬到 nickname
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='name') THEN
    ALTER TABLE agents ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE agents ALTER COLUMN name SET DEFAULT '';
  END IF;
  -- app_secret → 已搬到 agent_api_keys
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='app_secret') THEN
    ALTER TABLE agents ALTER COLUMN app_secret DROP NOT NULL;
    ALTER TABLE agents ALTER COLUMN app_secret SET DEFAULT '';
  END IF;
  -- app_key → 已搬到 agent_api_keys
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='app_key') THEN
    ALTER TABLE agents ALTER COLUMN app_key DROP NOT NULL;
  END IF;
END $$;
