import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCardExpiry } from '@/lib/billionconnect'

// POST /api/admin/operations/iccid
// Body: { iccids: string[] }
// 批次查詢 ICCID 有效期（BC F010），並補上本地訂單歸屬資訊
export async function POST(req: Request) {
  const { iccids } = await req.json().catch(() => ({}))

  if (!Array.isArray(iccids) || iccids.length === 0) {
    return NextResponse.json({ error: '請提供 ICCID' }, { status: 400 })
  }
  if (iccids.length > 100) {
    return NextResponse.json({ error: '單次最多查詢 100 筆' }, { status: 400 })
  }

  const trimmed = iccids.map((s: string) => s.trim()).filter(Boolean)

  // 1. 呼叫 BC F010
  let bcItems: any[] = []
  try {
    bcItems = await getCardExpiry(trimmed)
    if (!Array.isArray(bcItems)) bcItems = [bcItems]
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  // 2. 查本地訂單歸屬
  const supabase = createAdminClient()
  const orderMap: Record<string, { agent_nickname: string | null; channel_order_id: string }> = {}

  if (trimmed.length > 0) {
    // 從 order_items 找歸屬
    for (const iccid of trimmed) {
      const { data: item } = await supabase
        .from('order_items')
        .select('order_id, orders(channel_order_id, agent_id, agents(nickname))')
        .contains('iccid', [iccid])
        .limit(1)
        .maybeSingle()

      if (item) {
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
        const agent = order?.agents ? (Array.isArray(order.agents) ? order.agents[0] : order.agents) : null
        orderMap[iccid] = {
          channel_order_id: order?.channel_order_id ?? '',
          agent_nickname: agent?.nickname ?? null,
        }
      }
    }

    // 也從 esim_profiles 找
    const { data: profiles } = await supabase
      .from('esim_profiles')
      .select('iccid, order_id')
      .in('iccid', trimmed)

    for (const p of (profiles ?? [])) {
      if (!orderMap[p.iccid] && p.order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('channel_order_id, agent_id, agents(nickname)')
          .eq('id', p.order_id)
          .single()
        if (order) {
          const agent = order.agents ? (Array.isArray(order.agents) ? order.agents[0] : order.agents) : null
          orderMap[p.iccid] = {
            channel_order_id: order.channel_order_id,
            agent_nickname: agent?.nickname ?? null,
          }
        }
      }
    }
  }

  // 3. 合併結果
  const items = bcItems.map((bc: any) => ({
    iccid: bc.iccid,
    type: bc.type,
    status: bc.status,
    expiration_date: bc.expirationDate,
    postponed_month: bc.postponedMonth,
    max_delay_month: bc.maxDelayMonth,
    usage_count: bc.usageCount,
    channel_order_id: orderMap[bc.iccid]?.channel_order_id ?? null,
    agent_nickname: orderMap[bc.iccid]?.agent_nickname ?? null,
  }))

  return NextResponse.json({ items })
}
