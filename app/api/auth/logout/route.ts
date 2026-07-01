import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  await supabase.auth.signOut()
  // Redirect relative to the actual request origin (works on any deploy domain).
  return NextResponse.redirect(new URL('/login', req.url))
}
