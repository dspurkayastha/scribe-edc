'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2Icon, MessageSquareIcon, XCircleIcon, CheckCircleIcon } from 'lucide-react'
import {
  respondToQuery,
  closeQuery,
  cancelQuery,
  getQueryWithResponses,
} from '@/server/actions/queries'
import type { DataQueryRow, QueryResponseRow } from '@/types/database'

interface QueryDetailDialogProps {
  queryId: string
  studyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}

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

export function QueryDetailDialog({
  queryId,
  studyId,
  open,
  onOpenChange,
  canManage,
}: QueryDetailDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [responseText, setResponseText] = useState('')
  const [query, setQuery] = useState<(DataQueryRow & { responses: any[] }) | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && queryId) {
      setLoading(true)
      getQueryWithResponses(queryId, studyId).then((result) => {
        if (result.success) {
          setQuery(result.data)
        }
        setLoading(false)
      })
    } else {
      setQuery(null)
      setResponseText('')
    }
  }, [open, queryId, studyId])

  function handleRespond() {
    if (!responseText.trim()) return

    startTransition(async () => {
      const result = await respondToQuery(queryId, studyId, {
        responseText: responseText.trim(),
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Response added')
      setResponseText('')
      // Refresh query data
      const refreshed = await getQueryWithResponses(queryId, studyId)
      if (refreshed.success) setQuery(refreshed.data)
      router.refresh()
    })
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeQuery(queryId, studyId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Query closed')
      const refreshed = await getQueryWithResponses(queryId, studyId)
      if (refreshed.success) setQuery(refreshed.data)
      router.refresh()
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelQuery(queryId, studyId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Query cancelled')
      const refreshed = await getQueryWithResponses(queryId, studyId)
      if (refreshed.success) setQuery(refreshed.data)
      router.refresh()
    })
  }

  const isResolved = query?.status === 'closed' || query?.status === 'cancelled'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Query Details</DialogTitle>
          <DialogDescription>
            {query ? `Query ${query.id.slice(0, 8)}...` : 'Loading...'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : query ? (
          <div className="space-y-4">
            {/* Query metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <StatusBadge status={query.status} />
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>{' '}
                <PriorityBadge priority={query.priority} />
              </div>
              <div>
                <span className="text-muted-foreground">Participant:</span>{' '}
                <span className="font-medium">
                  {(query as any).participants?.study_number ?? '--'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                <span>{formatDate(query.created_at)}</span>
              </div>
            </div>

            <Separator />

            {/* Original query text */}
            <div>
              <Label className="text-xs text-muted-foreground">Query Text</Label>
              <p className="mt-1 text-sm bg-muted/50 rounded-md p-3">{query.query_text}</p>
            </div>

            {/* Response thread */}
            {query.responses && query.responses.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquareIcon className="h-3.5 w-3.5" />
                  Responses ({query.responses.length})
                </Label>
                <div className="space-y-2">
                  {query.responses.map((resp: any) => (
                    <div
                      key={resp.id}
                      className="bg-muted/30 border rounded-md p-3 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs">
                          {resp.user_profiles?.full_name ?? 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(resp.created_at)}
                        </span>
                      </div>
                      <p>{resp.response_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respond form (only if query is not resolved) */}
            {!isResolved && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="response-text">Add Response</Label>
                  <Textarea
                    id="response-text"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Could not load query details.
          </p>
        )}

        {query && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isResolved && (
              <>
                <Button
                  onClick={handleRespond}
                  disabled={isPending || !responseText.trim()}
                  size="sm"
                >
                  {isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-1" />}
                  Respond
                </Button>

                {canManage && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isPending}
                      size="sm"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Close Query
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isPending}
                      size="sm"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Cancel Query
                    </Button>
                  </>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
