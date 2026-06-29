import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() decodes the JWT locally (no network call) — fast enough for route protection.
  // API routes that need fresh auth use getUser() (network-validated) independently.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const { pathname } = request.nextUrl

  const PROTECTED = ['/dashboard', '/counter', '/tea-entry', '/orders', '/menu', '/reports', '/staff', '/settings', '/section-dashboard', '/tea-monitor', '/serving']
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const role = user.user_metadata?.role || 'owner'
    if (role === 'section_manager') {
      // If Manager is trying to access other protected routes, redirect to /serving
      const isTryingOtherProtected = PROTECTED.some(p => p !== '/serving' && pathname.startsWith(p))
      if (isTryingOtherProtected) {
        return NextResponse.redirect(new URL('/serving', request.url))
      }
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/serving', request.url))
      }
    } else {
      if (pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|order|token|manifest.json|icons).*)'],
}
