'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function NotificationsRealtime({ onNotification }: { onNotification?: (notification: Record<string, unknown>) => void }) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('dashboard-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, ({ new: notification }) => onNotification?.(notification)).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [onNotification])
  return null
}
