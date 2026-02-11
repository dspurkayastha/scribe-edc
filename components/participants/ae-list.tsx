'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2Icon, CheckCircleIcon } from 'lucide-react'
import { acknowledgeSAE } from '@/server/actions/adverse-events'
import { EditAeDialog } from '@/components/participants/edit-ae-dialog'
import type { AdverseEventRow, AeSeverity } from '@/types/database'

interface AeListProps {
  events: AdverseEventRow[]
  studyId: string
  canAcknowledge: boolean
  canEdit?: boolean
}

const SEVERITY_STYLES: Record<AeSeverity, string> = {
  mild: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
}

const OUTCOME_LABELS: Record<string, string> = {
  resolved: 'Resolved',
  ongoing: 'Ongoing',
  resolved_with_sequelae: 'Resolved w/ Sequelae',
  fatal: 'Fatal',
  unknown: 'Unknown',
}

const RELATEDNESS_LABELS: Record<string, string> = {
  unrelated: 'Unrelated',
  unlikely: 'Unlikely',
  possible: 'Possible',
  probable: 'Probable',
  definite: 'Definite',
}

function AcknowledgeButton({ aeId, studyId }: { aeId: string; studyId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAcknowledge() {
    startTransition(async () => {
      const result = await acknowledgeSAE(aeId, studyId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('SAE acknowledged')
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAcknowledge}
      disabled={isPending}
      className="text-xs"
    >
      {isPending ? (
        <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
      ) : (
        <CheckCircleIcon className="h-3 w-3 mr-1" />
      )}
      Acknowledge
    </Button>
  )
}

export function AeList({ events, studyId, canAcknowledge, canEdit = false }: AeListProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No adverse events reported for this participant.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px]">#</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Onset</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Relatedness</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>SAE</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((ae) => (
          <TableRow key={ae.id}>
            <TableCell className="font-mono text-xs">{ae.event_number}</TableCell>
            <TableCell className="text-sm max-w-[250px] truncate" title={ae.description}>
              {ae.description}
            </TableCell>
            <TableCell className="text-sm">
              {new Date(ae.onset_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </TableCell>
            <TableCell>
              <Badge className={SEVERITY_STYLES[ae.severity]}>
                {ae.severity}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {RELATEDNESS_LABELS[ae.relatedness] ?? ae.relatedness}
            </TableCell>
            <TableCell className="text-xs">
              {OUTCOME_LABELS[ae.outcome] ?? ae.outcome}
            </TableCell>
            <TableCell>
              {ae.is_sae ? (
                <div className="flex flex-col gap-1">
                  <Badge className="bg-red-100 text-red-800">SAE</Badge>
                  {ae.sae_acknowledged_at ? (
                    <span className="text-[10px] text-green-600">Acknowledged</span>
                  ) : (
                    <span className="text-[10px] text-red-600">Pending</span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {canEdit && (
                  <EditAeDialog ae={ae} studyId={studyId} />
                )}
                {ae.is_sae && !ae.sae_acknowledged_at && canAcknowledge && (
                  <AcknowledgeButton aeId={ae.id} studyId={studyId} />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
