import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const STAFF = [
  { username: 'suresh', email: 'suresh@abhinandan.in', password: 'Owner@2024', role: 'owner' },
  { username: 'ramesh', email: 'ramesh@abhinandan.in', password: 'Staff@2024', role: 'snacks_staff' },
  { username: 'sunita', email: 'sunita@abhinandan.in', password: 'Staff@2024', role: 'tea_staff' },
]

export async function POST() {
  try {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const results = []

    for (const s of STAFF) {
      const alreadyExists = existing?.users?.find(u => u.email === s.email)

      let authId: string
      if (alreadyExists) {
        authId = alreadyExists.id
        results.push({ email: s.email, status: 'already_exists', id: authId })
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
