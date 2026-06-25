'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function useLogout() {
  const router = useRouter()
  return async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }
}
