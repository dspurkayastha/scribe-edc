'use client'

import { useEffect, useState, useTransition } from 'react'
import { getRecordHistory } from '@/server/actions/audit'
import type { AuditLogRow } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecordHistoryPanelProps {
  recordId: string
  studyId: string
  /** Label displayed in the card heading, e.g. "Participant History" */
  title?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const ACTION_BADGE_STYLES: Record<string, { label: string; className: string }> = {
  INSERT: { label: 'Created', className: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Updated', className: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Deleted', className: 'bg-red-100 text-red-800' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Safely stringify a value for display */
function displayValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

/** Compute field-level diffs between old_data and new_data */
function computeDiffs(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  changedFields: string[] | null
): Array<{ field: string; oldVal: string; newVal: string }> {
  if (!oldData && !newData) return []

  // If changed_fields is provided, use that list; otherwise diff the keys
  const fields =
    changedFields && changedFields.length > 0
      ? changedFields
      : [
          ...new Set([
            ...Object.keys(oldData ?? {}),
            ...Object.keys(newData ?? {}),
          ]),
        ]

  const diffs: Array<{ field: string; oldVal: string; newVal: string }> = []

  for (const field of fields) {
    // Skip internal/metadata fields that are not useful to show
    if (['updated_at', 'created_at'].includes(field)) continue

    const oldVal = oldData?.[field]
    const newVal = newData?.[field]

    // Only show if values actually differ (or if changedFields told us to)
    if (changedFields || displayValue(oldVal) !== displayValue(newVal)) {
      diffs.push({
        field,
        oldVal: displayValue(oldVal),
        newVal: displayValue(newVal),
      })
    }
  }

  return diffs
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HistoryEntrySkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  )
}

function HistoryEntry({ entry }: { entry: AuditLogRow }) {
  const actionStyle = ACTION_BADGE_STYLES[entry.action] ?? {
    label: entry.action,
    className: 'bg-gray-100 text-gray-800',
  }

  const diffs =
    entry.action === 'UPDATE'
      ? computeDiffs(entry.old_data, entry.new_data, entry.changed_fields)
      : []

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <div className="flex-1 w-px bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1 pb-1">
        {/* Header row: timestamp + action badge */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <time className="text-muted-foreground text-xs">
            {formatTimestamp(entry.changed_at)}
          </time>
          <Badge className={actionStyle.className}>{actionStyle.label}</Badge>
        </div>

        {/* User */}
        {entry.changed_by && (
          <p className="text-xs text-muted-foreground truncate">
            by {entry.changed_by}
          </p>
        )}

        {/* Table name context */}
        <p className="text-xs text-muted-foreground">
          Table: <span className="font-mono">{entry.table_name}</span>
        </p>

        {/* Reason for change */}
        {entry.reason && (
          <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            <span className="font-medium">Reason:</span> {entry.reason}
          </div>
        )}

        {/* Field diffs for UPDATE */}
        {entry.action === 'UPDATE' && diffs.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {diffs.map((diff) => (
              <div
                key={diff.field}
                className="rounded border bg-muted/50 px-2 py-1 text-xs font-mono"
              >
                <span className="font-semibold text-foreground">
                  {diff.field}
                </span>
                <span className="text-red-600 line-through ml-2">
                  {diff.oldVal}
                </span>
                <span className="text-muted-foreground mx-1">&rarr;</span>
                <span className="text-green-700">{diff.newVal}</span>
              </div>
            ))}
          </div>
        )}

        {/* For INSERT, show what was created (summary) */}
        {entry.action === 'INSERT' && entry.new_data && (
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show initial values
            </summary>
            <div className="mt-1 space-y-0.5">
              {Object.entries(entry.new_data)
                .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded border bg-muted/50 px-2 py-0.5 text-xs font-mono"
                  >
                    <span className="font-semibold text-foreground">
                      {key}
                    </span>
                    <span className="text-green-700 ml-2">
                      {displayValue(val)}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}

        {/* For DELETE, show what was removed (summary) */}
        {entry.action === 'DELETE' && entry.old_data && (
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show deleted values
            </summary>
            <div className="mt-1 space-y-0.5">
              {Object.entries(entry.old_data)
                .filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key))
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded border bg-muted/50 px-2 py-0.5 text-xs font-mono"
                  >
                    <span className="font-semibold text-foreground">
                      {key}
                    </span>
                    <span className="text-red-600 line-through ml-2">
                      {displayValue(val)}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RecordHistoryPanel({
  recordId,
  studyId,
  title = 'Record History',
}: RecordHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState<AuditLogRow[]>([])
  const [hasFetched, setHasFetched] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Fetch history when the panel is first opened
  useEffect(() => {
    if (!isOpen || hasFetched) return

    startTransition(async () => {
      const data = await getRecordHistory(recordId, studyId)
      setEntries(data)
      setHasFetched(true)
    })
  }, [isOpen, hasFetched, recordId, studyId])

  const visibleEntries = entries.slice(0, visibleCount)
  const hasMore = visibleCount < entries.length

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-base">
              {isOpen ? (
                <ChevronDownIcon className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 shrink-0" />
              )}
              <HistoryIcon className="h-5 w-5 shrink-0" />
              {title}
              {hasFetched && entries.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {entries.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {/* Loading state */}
            {isPending && !hasFetched && (
              <div className="space-y-1">
                <HistoryEntrySkeleton />
                <HistoryEntrySkeleton />
                <HistoryEntrySkeleton />
              </div>
            )}

            {/* Empty state */}
            {hasFetched && entries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <HistoryIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No history recorded for this record yet.
                </p>
              </div>
            )}

            {/* Entries timeline */}
            {hasFetched && entries.length > 0 && (
              <div>
                {visibleEntries.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}

                {/* Show more button */}
                {hasMore && (
                  <div className="pt-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setVisibleCount((prev) => prev + PAGE_SIZE)
                      }
                    >
                      Show more ({entries.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
