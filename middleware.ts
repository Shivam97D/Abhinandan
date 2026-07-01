import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Page routes that require a logged-in staff user ──────────────────────────
const PROTECTED_PAGES = ['/dashboard', '/counter', '/orders', '/menu', '/reports', '/staff', '/settings', '/serving']

// Roles that have actual access. Anything else (e.g. a freshly self-signed-up
// "pending" account, or a missing role) gets NO access until the owner assigns one.
const VALID_ROLES = ['owner', 'section_manager', 'snacks_staff']

// ── API allowlist: endpoints reachable WITHOUT authentication ────────────────
// This is intentionally the ONLY way an unauthenticated request can touch /api.
// Everything not listed here is default-denied unless the caller is authenticated.
// Scope: the public customer self-order flow (/order) + signed server webhooks.
function isPublicApi(pathname: string, method: string): boolean {
  // Customer-facing reads
  if (pathname === '/api/menu' && method === 'GET') return true            // browse menu
  if (pathname === '/api/settings' && method === 'GET') return true        // shop name / UPI id for the bill
  // Customer order placement + per-device order history
  if (pathname === '/api/orders' && method === 'POST') return true         // place a self-order
  if (pathname.startsWith('/api/orders/session/') && method === 'GET') return true // past tickets for this device
  // Customer token status (single-token reads only — never the staff collection)
  if (pathname.startsWith('/api/tokens/') && method === 'GET') return true // /api/tokens/[id] + /by-number/[n]
  // Self-handling / secret-gated auth utilities
  if (pathname === '/api/auth/logout') return true
  if (pathname === '/api/auth/signup' && method === 'POST') return true     // public staff self-signup (creates a pending account)
  if (pathname === '/api/users/me' && method === 'GET') return true        // returns { user: null } when signed out
  if (pathname === '/api/admin/setup-auth' && method === 'POST') return true // route self-gates with ADMIN_SETUP_SECRET
  return false
}

// ── API endpoints restricted to the owner role ──────────────────────────────
function isOwnerOnlyApi(pathname: string, method: string): boolean {
  if (pathname === '/api/analytics') return true
  if (pathname.startsWith('/api/staff')) return true
  if (pathname === '/api/menu/upload') return true
  if (pathname === '/api/menu' && method !== 'GET') return true            // create/edit/delete menu
  if (pathname === '/api/settings' && method !== 'GET') return true        // change shop config / UPI id
  if (pathname === '/api/orders' && method === 'GET') return true          // full order ledger
  return false
}

function makeClient(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  return { supabase, getResponse: () => response }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ── API routes: default-deny, JSON responses ──────────────────────────────
  if (pathname.startsWith('/api')) {
    // Public allowlist short-circuits before any auth lookup (keeps the
    // customer order flow fast — no network round-trip to Supabase).
    if (isPublicApi(pathname, method)) {
      return NextResponse.next({ request })
    }

    // Everything else requires a network-validated user.
    const { supabase, getResponse } = makeClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const role = user.user_metadata?.role
    // Pending / unassigned accounts have no API access at all.
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Account pending role assignment' }, { status: 403 })
    }

    if (isOwnerOnlyApi(pathname, method) && role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden — owner access required' }, { status: 403 })
    }

    // The Manager (section_manager) is confined to the serving console: token
    // endpoints + the session-token utility. Block everything else.
    if (role === 'section_manager') {
      const managerAllowed = pathname.startsWith('/api/tokens') || pathname === '/api/auth/session'
      if (!managerAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return getResponse()
  }

  // ── Page routes: redirect-based protection ────────────────────────────────
  const { supabase, getResponse } = makeClient(request)
  // getUser() validates the session against the Supabase Auth server (not just
  // a local JWT decode) so route protection cannot be spoofed with a stale token.
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PAGES.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const role = user.user_metadata?.role
    if (!VALID_ROLES.includes(role)) {
      // Pending / unassigned account: only the /pending screen is allowed.
      if (pathname !== '/pending' && (isProtected || pathname === '/login')) {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
    } else if (role === 'section_manager') {
      // Manager may only use /serving — bounce any other protected page back.
      const isTryingOtherProtected = PROTECTED_PAGES.some(p => p !== '/serving' && pathname.startsWith(p))
      if (isTryingOtherProtected) {
        return NextResponse.redirect(new URL('/serving', request.url))
      }
      if (pathname === '/login' || pathname === '/pending') {
        return NextResponse.redirect(new URL('/serving', request.url))
      }
    } else {
      // owner / snacks_staff
      if (pathname === '/login' || pathname === '/pending') {
        return NextResponse.redirect(new URL(role === 'snacks_staff' ? '/counter' : '/dashboard', request.url))
      }
    }
  }

  return getResponse()
}

export const config = {
  // Run on everything except static assets and the public customer pages.
  // `order(?:/|$)` excludes /order and /order/token but NOT the staff /orders
  // page; `token/` excludes the customer /token/[id] status page.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|order(?:/|$)|token/).*)'],
}
