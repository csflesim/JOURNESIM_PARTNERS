import { NextRequest, NextResponse } from 'next/server'

/**
 * Subdomain routing for journesim.com on Vercel
 *
 * journesim.com / www.journesim.com  → C端前台 (root)
 * admin.journesim.com                → 管理後台
 *   /                                → redirect to /admin (dashboard)
 *   /purchase-esim-orders/...        → rewrite to /admin/purchase-esim-orders/...
 *   (any non-/admin, non-/api path)  → rewrite to /admin{path}
 * sale.journesim.com                 → 銷售模組  /sale/**  (future)
 * partners.journesim.com             → 代理商    /partners/** (future)
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const pathname = req.nextUrl.pathname

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Local development: allow everything
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return NextResponse.next()
  }

  const subdomain = host.split('.')[0]

  switch (subdomain) {
    case 'admin': {
      // Root → redirect to dashboard
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      // API routes pass through as-is
      if (pathname.startsWith('/api')) {
        return NextResponse.next()
      }
      // Already has /admin prefix → pass through
      if (pathname.startsWith('/admin')) {
        return NextResponse.next()
      }
      // All other paths → rewrite to /admin{path}
      // e.g. /purchase-esim-orders/create → /admin/purchase-esim-orders/create
      return NextResponse.rewrite(new URL('/admin' + pathname, req.url))
    }

    case 'sale': {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/sale', req.url))
      }
      if (!pathname.startsWith('/sale') && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/sale', req.url))
      }
      break
    }

    case 'partners': {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/partners', req.url))
      }
      if (!pathname.startsWith('/partners') && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/partners', req.url))
      }
      break
    }

    default: {
      // Main domain (journesim.com / www.journesim.com)
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/sale') ||
        pathname.startsWith('/partners')
      ) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
