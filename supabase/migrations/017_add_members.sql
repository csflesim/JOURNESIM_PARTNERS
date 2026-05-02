-- 會員管理（C端會員）
CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  phone           text,
  display_name    text NOT NULL DEFAULT '',
  avatar_url      text,
  auth_provider   text NOT NULL DEFAULT 'email',      -- email | google | apple | line
  is_active       boolean NOT NULL DEFAULT true,
  note            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_members_email ON members (email);
CREATE INDEX idx_members_created_at ON members (created_at DESC);

-- RLS（admin service role 存取）
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON members
  FOR ALL USING (auth.role() = 'service_role');
