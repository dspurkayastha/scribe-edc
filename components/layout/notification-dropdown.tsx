'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/server/actions/notifications'
import type { NotificationRow } from '@/types/database'

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return date.toLocaleDateString()
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationRow
  onRead: (id: string) => void
}) {
  const router = useRouter()

  function handleClick() {
    if (!notification.is_read) {
      onRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent ${
        notification.is_read ? 'opacity-60' : ''
      }`}
    >
      <div
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          notification.is_read ? 'bg-transparent' : 'bg-primary'
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-tight ${notification.is_read ? '' : 'font-medium'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {timeAgo(notification.created_at)}
        </p>
      </div>
    </button>
  )
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch {
      // Silently fail - count will stay at previous value
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount() // eslint-disable-line react-hooks/set-state-in-effect -- initial fetch + polling is intentional
    const interval = setInterval(fetchUnreadCount, 60_000) // poll every 60s
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch notifications when popover opens
  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setLoading(true)
      try {
        const result = await getNotifications({ page: 1, pageSize: 20 })
        setNotifications(result.data)
      } catch {
        // Silently fail
      }
      setLoading(false)
    }
  }

  // Mark a single notification as read
  async function handleMarkAsRead(notificationId: string) {
    const result = await markAsRead(notificationId)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  // Mark all as read
  async function handleMarkAllAsRead() {
    setMarkingAll(true)
    const result = await markAllAsRead()
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
    setMarkingAll(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              {markingAll ? 'Marking...' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-80">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          )}

          {!loading && notifications.length > 0 && (
            <div className="py-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
