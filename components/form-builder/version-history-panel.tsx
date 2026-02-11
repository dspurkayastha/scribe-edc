'use client'

import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { FormDefinitionRow } from '@/types/database'

interface VersionHistoryPanelProps {
  versions: FormDefinitionRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VersionHistoryPanel({ versions, open, onOpenChange }: VersionHistoryPanelProps) {
  const sorted = [...versions].sort((a, b) => b.version - a.version)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">No version history available.</p>
          )}
          {sorted.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">v{version.version}</span>
                  {version.is_active && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                      Active
                    </Badge>
                  )}
                  {version.is_locked && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      Locked
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(version.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
