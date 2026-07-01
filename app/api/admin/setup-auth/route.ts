import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Passwords come from the environment so no credential lives in source control.
// The literal fallbacks only exist to keep an un-provisioned dev box working —
// set OWNER_PASSWORD / MANAGER_PASSWORD in production and re-run this endpoint.
const STAFF = [
  { username: 'Owner', email: 'owner@abhinandan.in', password: process.env.OWNER_PASSWORD || 'Owner@99', role: 'owner' },
  { username: 'Manager', email: 'manager@abhinandan.in', password: process.env.MANAGER_PASSWORD || 'Manager@88', role: 'section_manager' },
  { username: 'Server', email: 'server@abhinandan.in', password: process.env.SERVER_PASSWORD || 'Server@88', role: 'snacks_staff' },
  // Developer admin: exempt from single-device login. Provisioned here so it
  // always exists (not only via the one-off cleanup script).
  { username: 'Admin', email: 'admin@abhinandan.in', password: process.env.ADMIN_PASSWORD || 'Admin@908', role: 'owner' },
]

export async function POST(req: NextRequest) {
  // This endpoint can create accounts and RESET passwords, so it is gated behind
  // a server-only shared secret. Without ADMIN_SETUP_SECRET configured it is off.
  const secret = process.env.ADMIN_SETUP_SECRET
  if (!secret || req.headers.get('x-setup-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const results = []

    for (const s of STAFF) {
      const alreadyExists = existing?.users?.find(u => u.email === s.email)

      let authId: string
      if (alreadyExists) {
        authId = alreadyExists.id
        // Update user password to match the requested one if it already exists
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
          password: s.password,
          user_metadata: { name: s.username, role: s.role },
        })
        if (updateError) {
          results.push({ email: s.email, status: 'update_error', error: updateError.message })
          continue
        }
        results.push({ email: s.email, status: 'updated_credentials', id: authId })
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { name: s.username, role: s.role },
        })
        if (error) {
          results.push({ email: s.email, status: 'error', error: error.message })
          continue
        }
        authId = data.user.id
        results.push({ email: s.email, status: 'created', id: authId })
      }

      await prisma.user.updateMany({
        where: { name: { contains: s.username, mode: 'insensitive' } },
        data: { supabaseId: authId },
      })
    }

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[setup-auth]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
