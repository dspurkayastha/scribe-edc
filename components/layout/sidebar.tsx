'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useStudyContext } from './study-context-provider'
import {
  LayoutDashboard,
  Users,
  FileText,
  HelpCircle,
  BarChart3,
  ClipboardList,
  Settings,
  Shield,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Participants', icon: Users, href: '/participants' },
  { label: 'Queries', icon: HelpCircle, href: '/queries' },
  { label: 'Reports', icon: BarChart3, href: '/reports' },
  { label: 'Audit Log', icon: Shield, href: '/audit-log' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { orgSlug, studySlug } = useStudyContext()
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/select-study" className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5" />
          <span>SCRIBE</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const fullHref = `${basePath}${item.href}`
          const isActive = pathname.startsWith(fullHref)

          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
