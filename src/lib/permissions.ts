// ── Module layer (outer) ───────────────────────────────────────────────
// Disabling a module hides all permission groups that belong to it.

export type ModuleKey = 'purchase' | 'sale' | 'partners' | 'biz'

export interface ModuleDef {
  moduleKey: ModuleKey
  label: Record<string, string>
  /** groupKeys that belong to this module */
  groupKeys: string[]
}

export const MODULES: ModuleDef[] = [
  {
    moduleKey: 'purchase',
    label: { 'zh-TW': '採購模組', 'zh-CN': '采购模块', en: 'Purchase', ja: '購入モジュール', ko: '구매 모듈' },
    groupKeys: ['esimOrders', 'simOrders', 'plans', 'operations', 'billing', 'reports', 'announcements'],
  },
  {
    moduleKey: 'sale',
    label: { 'zh-TW': '銷售模組', 'zh-CN': '销售模块', en: 'Sales', ja: '販売モジュール', ko: '판매 모듈' },
    groupKeys: ['saleEsimOrders', 'saleSimOrders', 'saleProducts'],
  },
  {
    moduleKey: 'partners',
    label: { 'zh-TW': '代理商模組', 'zh-CN': '代理商模块', en: 'Partners', ja: 'パートナーモジュール', ko: '파트너 모듈' },
    groupKeys: ['partnerEsimOrders', 'partnerSimOrders', 'partnerOperations', 'partnerPlans'],
  },
  {
    moduleKey: 'biz',
    label: { 'zh-TW': '業務模組', 'zh-CN': '业务模块', en: 'Business', ja: 'ビジネスモジュール', ko: '비즈니스 모듈' },
    groupKeys: ['agents', 'agentProducts', 'members'],
  },
]

// ── Page-level permissions (inner) ────────────────────────────────────

export type PermissionKey =
  // 業務功能
  | 'dashboard' | 'guide' | 'settings' | 'terminology'
  // eSIM 訂單
  | 'esim_create' | 'esim_recharge' | 'esim_third' | 'esim_list'
  // SIM 卡訂單
  | 'sim_create' | 'sim_third' | 'sim_list'
  // 套餐列表
  | 'plans_esim' | 'plans_sim' | 'plans_accel'
  // 運營管理
  | 'op_plan_query' | 'op_after_sales' | 'op_kyc' | 'op_iccid'
  // 帳單管理
  | 'bill_recharge' | 'bill_detail' | 'bill_invoice' | 'bill_fx'
  // 報表
  | 'rep_purchase' | 'rep_sales'
  // 公告
  | 'ann_biz' | 'ann_sys'
  // 銷售 eSIM 訂單
  | 'sale_esim_create' | 'sale_esim_list'
  // 銷售 SIM 訂單
  | 'sale_sim_create' | 'sale_sim_list'
  // 商品管理
  | 'sale_product_esim' | 'sale_product_sim' | 'sale_product_accel'
  // 代理商商品管理
  | 'agent_product_list' | 'agent_product_edit'
  // 代理商訂單
  | 'partner_esim_create' | 'partner_esim_list' | 'partner_sim_create' | 'partner_sim_list'
  // 代理商運營
  | 'partner_op_plan_query' | 'partner_op_after_sales' | 'partner_op_kyc' | 'partner_op_iccid'
  // 代理商套餐
  | 'partner_plans_esim' | 'partner_plans_sim' | 'partner_plans_accel'
  // 會員管理
  | 'member_list' | 'member_edit'
  // 帳號管理
  | 'acct_mgmt' | 'acct_roles' | 'acct_agents'
  // API
  | 'api_auth' | 'api_docs'

export interface PermissionGroup {
  groupKey: string
  /** which module this group belongs to (undefined = system/shared, no module gate) */
  moduleKey?: ModuleKey
  label: Record<string, string>
  items: { key: PermissionKey; label: Record<string, string> }[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupKey: 'business',
    label: { 'zh-TW': '業務功能', 'zh-CN': '业务功能', en: 'Business', ja: 'ビジネス機能', ko: '업무 기능' },
    items: [
      { key: 'dashboard',   label: { 'zh-TW': '儀表板',   'zh-CN': '仪表板',   en: 'Dashboard',     ja: 'ダッシュボード', ko: '대시보드' } },
      { key: 'guide',       label: { 'zh-TW': '產品指南', 'zh-CN': '产品指南', en: 'Product Guide', ja: '製品ガイド',     ko: '제품 가이드' } },
      { key: 'settings',    label: { 'zh-TW': '設定',     'zh-CN': '设置',     en: 'Settings',      ja: '設定',           ko: '설정' } },
      { key: 'terminology', label: { 'zh-TW': '用詞管理', 'zh-CN': '用词管理', en: 'Terminology',   ja: '用語管理',       ko: '용어 관리' } },
    ],
  },
  {
    groupKey: 'esimOrders',
    moduleKey: 'purchase',
    label: { 'zh-TW': 'eSIM訂單', 'zh-CN': 'eSIM订单', en: 'eSIM Orders', ja: 'eSIM 注文', ko: 'eSIM 주문' },
    items: [
      { key: 'esim_create',   label: { 'zh-TW': '創建訂單',      'zh-CN': '创建订单',      en: 'Create Order',    ja: '注文作成',           ko: '주문 생성' } },
      { key: 'esim_recharge', label: { 'zh-TW': '創建充值訂單',  'zh-CN': '创建充值订单',  en: 'Recharge Order',  ja: '充電注文',           ko: '충전 주문' } },
      { key: 'esim_third',    label: { 'zh-TW': '創建第三方訂單','zh-CN': '创建第三方订单', en: '3rd Party Order', ja: 'サードパーティ注文', ko: '서드파티 주문' } },
      { key: 'esim_list',     label: { 'zh-TW': '訂單列表',      'zh-CN': '订单列表',      en: 'Order List',      ja: '注文一覧',           ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'simOrders',
    moduleKey: 'purchase',
    label: { 'zh-TW': 'SIM卡訂單', 'zh-CN': 'SIM卡订单', en: 'SIM Orders', ja: 'SIM 注文', ko: 'SIM 주문' },
    items: [
      { key: 'sim_create', label: { 'zh-TW': '創建訂單',      'zh-CN': '创建订单',      en: 'Create Order',    ja: '注文作成',           ko: '주문 生成' } },
      { key: 'sim_third',  label: { 'zh-TW': '創建第三方訂單','zh-CN': '创建第三方订单', en: '3rd Party Order', ja: 'サードパーティ注文', ko: '서드파티 주문' } },
      { key: 'sim_list',   label: { 'zh-TW': '訂單列表',      'zh-CN': '订单列表',      en: 'Order List',      ja: '注文一覧',           ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'plans',
    moduleKey: 'purchase',
    label: { 'zh-TW': '套餐列表', 'zh-CN': '套餐列表', en: 'Plans', ja: 'プラン一覧', ko: '요금제 목록' },
    items: [
      { key: 'plans_esim',  label: { 'zh-TW': 'eSIM套餐',  'zh-CN': 'eSIM套餐',  en: 'eSIM Plans',    ja: 'eSIM プラン',       ko: 'eSIM 요금제' } },
      { key: 'plans_sim',   label: { 'zh-TW': 'SIM套餐',   'zh-CN': 'SIM套餐',   en: 'SIM Plans',     ja: 'SIM プラン',        ko: 'SIM 요금제' } },
      { key: 'plans_accel', label: { 'zh-TW': '加速包套餐','zh-CN': '加速包套餐', en: 'Booster Plans', ja: 'ブースタープラン',  ko: '부스터 요금제' } },
    ],
  },
  {
    groupKey: 'operations',
    moduleKey: 'purchase',
    label: { 'zh-TW': '運營管理', 'zh-CN': '运营管理', en: 'Operations', ja: '運営管理', ko: '운영 관리' },
    items: [
      { key: 'op_plan_query',  label: { 'zh-TW': '套餐信息查詢','zh-CN': '套餐信息查询', en: 'Plan Query',    ja: 'プラン照会',        ko: '요금제 조회' } },
      { key: 'op_after_sales', label: { 'zh-TW': '售後列表',     'zh-CN': '售后列表',     en: 'After-Sales',   ja: 'アフターサービス',  ko: '애프터서비스' } },
      { key: 'op_kyc',         label: { 'zh-TW': '實名認證狀態','zh-CN': '实名认证状态', en: 'KYC Status',    ja: 'KYC ステータス',   ko: 'KYC 상태' } },
      { key: 'op_iccid',       label: { 'zh-TW': 'ICCID 管理',  'zh-CN': 'ICCID 管理',  en: 'ICCID Mgmt',    ja: 'ICCID 管理',       ko: 'ICCID 관리' } },
    ],
  },
  {
    groupKey: 'billing',
    moduleKey: 'purchase',
    label: { 'zh-TW': '帳單管理', 'zh-CN': '账单管理', en: 'Billing', ja: '請求管理', ko: '청구 관리' },
    items: [
      { key: 'bill_recharge', label: { 'zh-TW': '帳戶充值', 'zh-CN': '账户充值', en: 'Top Up',          ja: 'チャージ',      ko: '충전' } },
      { key: 'bill_detail',   label: { 'zh-TW': '帳單明細', 'zh-CN': '账单明细', en: 'Bill Details',    ja: '請求明細',      ko: '청구 내역' } },
      { key: 'bill_invoice',  label: { 'zh-TW': '發票管理', 'zh-CN': '发票管理', en: 'Invoices',        ja: '請求書管理',    ko: '청구서 관리' } },
      { key: 'bill_fx',       label: { 'zh-TW': '匯率管理', 'zh-CN': '汇率管理', en: 'Exchange Rates',  ja: '為替管理',      ko: '환율 관리' } },
    ],
  },
  {
    groupKey: 'reports',
    moduleKey: 'purchase',
    label: { 'zh-TW': '報表', 'zh-CN': '报表', en: 'Reports', ja: 'レポート', ko: '보고서' },
    items: [
      { key: 'rep_purchase', label: { 'zh-TW': '採購對帳單',  'zh-CN': '采购对账单',  en: 'Purchase Report', ja: '購入レポート', ko: '구매 보고서' } },
      { key: 'rep_sales',    label: { 'zh-TW': '套餐銷售統計','zh-CN': '套餐销售统计', en: 'Sales Stats',     ja: '販売統計',     ko: '판매 통계' } },
    ],
  },
  {
    groupKey: 'announcements',
    moduleKey: 'purchase',
    label: { 'zh-TW': '公告', 'zh-CN': '公告', en: 'Announcements', ja: 'お知らせ', ko: '공지사항' },
    items: [
      { key: 'ann_biz', label: { 'zh-TW': '業務公告', 'zh-CN': '业务公告', en: 'Business News',  ja: 'ビジネスお知らせ', ko: '비즈니스 공지' } },
      { key: 'ann_sys', label: { 'zh-TW': '系統公告', 'zh-CN': '系统公告', en: 'System Notice',  ja: 'システムお知らせ', ko: '시스템 공지' } },
    ],
  },
  {
    groupKey: 'saleEsimOrders',
    moduleKey: 'sale',
    label: { 'zh-TW': 'eSIM訂單', 'zh-CN': 'eSIM订单', en: 'eSIM Orders', ja: 'eSIM 注文', ko: 'eSIM 주문' },
    items: [
      { key: 'sale_esim_create', label: { 'zh-TW': '創建訂單', 'zh-CN': '创建订单', en: 'Create Order', ja: '注文作成', ko: '주문 생성' } },
      { key: 'sale_esim_list',   label: { 'zh-TW': '訂單列表', 'zh-CN': '订单列表', en: 'Order List',   ja: '注文一覧', ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'saleSimOrders',
    moduleKey: 'sale',
    label: { 'zh-TW': 'SIM卡訂單', 'zh-CN': 'SIM卡订单', en: 'SIM Orders', ja: 'SIM 注文', ko: 'SIM 주문' },
    items: [
      { key: 'sale_sim_create', label: { 'zh-TW': '創建訂單', 'zh-CN': '创建订单', en: 'Create Order', ja: '注文作成', ko: '주문 생성' } },
      { key: 'sale_sim_list',   label: { 'zh-TW': '訂單列表', 'zh-CN': '订单列表', en: 'Order List',   ja: '注文一覧', ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'saleProducts',
    moduleKey: 'sale',
    label: { 'zh-TW': '商品管理', 'zh-CN': '商品管理', en: 'Products', ja: '商品管理', ko: '상품 관리' },
    items: [
      { key: 'sale_product_esim',  label: { 'zh-TW': 'eSIM 商品', 'zh-CN': 'eSIM 商品', en: 'eSIM Products',    ja: 'eSIM 商品',      ko: 'eSIM 상품' } },
      { key: 'sale_product_sim',   label: { 'zh-TW': 'SIM 商品',  'zh-CN': 'SIM 商品',  en: 'SIM Products',     ja: 'SIM 商品',       ko: 'SIM 상품' } },
      { key: 'sale_product_accel', label: { 'zh-TW': '加速包',    'zh-CN': '加速包',    en: 'Booster Products', ja: 'ブースター商品', ko: '부스터 상품' } },
    ],
  },
  {
    groupKey: 'partnerEsimOrders',
    moduleKey: 'partners',
    label: { 'zh-TW': 'eSIM 訂單', 'zh-CN': 'eSIM 订单', en: 'eSIM Orders', ja: 'eSIM 注文', ko: 'eSIM 주문' },
    items: [
      { key: 'partner_esim_create', label: { 'zh-TW': '創建訂單', 'zh-CN': '创建订单', en: 'Create Order', ja: '注文作成', ko: '주문 생성' } },
      { key: 'partner_esim_list',   label: { 'zh-TW': '訂單列表', 'zh-CN': '订单列表', en: 'Order List',   ja: '注文一覧', ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'partnerSimOrders',
    moduleKey: 'partners',
    label: { 'zh-TW': 'SIM 卡訂單', 'zh-CN': 'SIM 卡订单', en: 'SIM Orders', ja: 'SIM 注文', ko: 'SIM 주문' },
    items: [
      { key: 'partner_sim_create', label: { 'zh-TW': '創建訂單', 'zh-CN': '创建订单', en: 'Create Order', ja: '注文作成', ko: '주문 생성' } },
      { key: 'partner_sim_list',   label: { 'zh-TW': '訂單列表', 'zh-CN': '订单列表', en: 'Order List',   ja: '注文一覧', ko: '주문 목록' } },
    ],
  },
  {
    groupKey: 'partnerOperations',
    moduleKey: 'partners',
    label: { 'zh-TW': '運營管理', 'zh-CN': '运营管理', en: 'Operations', ja: '運営管理', ko: '운영 관리' },
    items: [
      { key: 'partner_op_plan_query',  label: { 'zh-TW': '套餐信息查詢', 'zh-CN': '套餐信息查询', en: 'Plan Query',  ja: 'プラン照会',       ko: '요금제 조회' } },
      { key: 'partner_op_after_sales', label: { 'zh-TW': '售後列表',     'zh-CN': '售后列表',     en: 'After-Sales', ja: 'アフターサービス', ko: '애프터서비스' } },
      { key: 'partner_op_kyc',         label: { 'zh-TW': '實名認證狀態', 'zh-CN': '实名认证状态', en: 'KYC Status',  ja: 'KYC ステータス',  ko: 'KYC 상태' } },
      { key: 'partner_op_iccid',       label: { 'zh-TW': 'ICCID 管理',  'zh-CN': 'ICCID 管理',  en: 'ICCID Mgmt',  ja: 'ICCID 管理',      ko: 'ICCID 관리' } },
    ],
  },
  {
    groupKey: 'partnerPlans',
    moduleKey: 'partners',
    label: { 'zh-TW': '套餐列表', 'zh-CN': '套餐列表', en: 'Plans', ja: 'プラン一覧', ko: '요금제 목록' },
    items: [
      { key: 'partner_plans_esim',  label: { 'zh-TW': 'eSIM 套餐',  'zh-CN': 'eSIM 套餐',  en: 'eSIM Plans',    ja: 'eSIM プラン',      ko: 'eSIM 요금제' } },
      { key: 'partner_plans_sim',   label: { 'zh-TW': 'SIM 套餐',   'zh-CN': 'SIM 套餐',   en: 'SIM Plans',     ja: 'SIM プラン',       ko: 'SIM 요금제' } },
      { key: 'partner_plans_accel', label: { 'zh-TW': '加速包套餐', 'zh-CN': '加速包套餐', en: 'Booster Plans', ja: 'ブースタープラン', ko: '부스터 요금제' } },
    ],
  },
  {
    groupKey: 'agentProducts',
    moduleKey: 'biz',
    label: { 'zh-TW': '代理商商品', 'zh-CN': '代理商商品', en: 'Agent Products', ja: '代理店商品', ko: '대리점 상품' },
    items: [
      { key: 'agent_product_list', label: { 'zh-TW': '商品列表', 'zh-CN': '商品列表', en: 'Product List', ja: '商品一覧', ko: '상품 목록' } },
      { key: 'agent_product_edit', label: { 'zh-TW': '商品設定', 'zh-CN': '商品设定', en: 'Product Config', ja: '商品設定', ko: '상품 설정' } },
    ],
  },
  {
    groupKey: 'members',
    moduleKey: 'biz',
    label: { 'zh-TW': '會員管理', 'zh-CN': '会员管理', en: 'Members', ja: '会員管理', ko: '회원 관리' },
    items: [
      { key: 'member_list', label: { 'zh-TW': '會員列表', 'zh-CN': '会员列表', en: 'Member List', ja: '会員一覧', ko: '회원 목록' } },
      { key: 'member_edit', label: { 'zh-TW': '會員編輯', 'zh-CN': '会员编辑', en: 'Edit Member', ja: '会員編集', ko: '회원 편집' } },
    ],
  },
  {
    groupKey: 'accounts',
    label: { 'zh-TW': '帳號管理', 'zh-CN': '账号管理', en: 'Accounts', ja: 'アカウント管理', ko: '계정 관리' },
    items: [
      { key: 'acct_mgmt',   label: { 'zh-TW': '帳號管理',   'zh-CN': '账号管理',   en: 'Accounts',    ja: 'アカウント管理', ko: '계정 관리' } },
      { key: 'acct_roles',  label: { 'zh-TW': '角色管理',   'zh-CN': '角色管理',   en: 'Role Mgmt',   ja: 'ロール管理',     ko: '역할 관리' } },
      { key: 'acct_agents', label: { 'zh-TW': '代理商管理', 'zh-CN': '代理商管理', en: 'Agent Mgmt',  ja: '代理店管理',     ko: '대리점 관리' } },
    ],
  },
  {
    groupKey: 'api',
    label: { 'zh-TW': 'API', 'zh-CN': 'API', en: 'API', ja: 'API', ko: 'API' },
    items: [
      { key: 'api_auth', label: { 'zh-TW': '接口授權', 'zh-CN': '接口授权', en: 'API Auth', ja: 'API 認証',        ko: 'API 인증' } },
      { key: 'api_docs', label: { 'zh-TW': '接口文檔', 'zh-CN': '接口文档', en: 'API Docs', ja: 'API ドキュメント', ko: 'API 文서' } },
    ],
  },
]

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key))
