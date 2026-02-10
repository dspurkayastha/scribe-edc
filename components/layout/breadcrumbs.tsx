'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useStudyContext } from './study-context-provider'

export function Breadcrumbs() {
  const pathname = usePathname()
  const { orgSlug, studySlug } = useStudyContext()
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  const segments = pathname.replace(basePath, '').split('/').filter(Boolean)

  const crumbs = segments.map((segment, i) => {
    const href = `${basePath}/${segments.slice(0, i + 1).join('/')}`
    const label = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    return { href, label }
  })

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground md:px-6">
      <Link href={`${basePath}/dashboard`} className="hover:text-foreground">
        {studySlug}
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <Link href={crumb.href} className="hover:text-foreground">
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
