'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QueryDetailDialog } from './query-detail-dialog'
import type { DataQueryRow } from '@/types/database'

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-red-100 text-red-800',
    answered: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return (
    <Badge className={styles[status] ?? 'bg-gray-100 text-gray-800'}>
      {status}
    </Badge>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    normal: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-600',
  }
  return (
    <Badge className={styles[priority] ?? 'bg-gray-100 text-gray-800'}>
      {priority}
    </Badge>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface QueriesTableProps {
  rows: any[]
  studyId: string
  canManage: boolean
}

export function QueriesTable({ rows, studyId, canManage }: QueriesTableProps) {
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function handleRowClick(queryId: string) {
    setSelectedQueryId(queryId)
    setDetailOpen(true)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Participant</TableHead>
            <TableHead>Query Text</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: any) => (
            <TableRow
              key={row.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(row.id)}
            >
              <TableCell
                className="font-mono text-xs max-w-[100px] truncate"
                title={row.id}
              >
                {row.id.slice(0, 8)}...
              </TableCell>
              <TableCell className="text-sm">
                {row.participants?.study_number ?? (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell className="text-sm max-w-[300px] truncate" title={row.query_text}>
                {row.query_text}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={row.priority} />
              </TableCell>
              <TableCell className="text-xs">
                {row.category}
              </TableCell>
              <TableCell className="text-xs">
                {formatDate(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedQueryId && (
        <QueryDetailDialog
          queryId={selectedQueryId}
          studyId={studyId}
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v)
            if (!v) setSelectedQueryId(null)
          }}
          canManage={canManage}
        />
      )}
    </>
  )
}
