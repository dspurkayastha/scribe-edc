import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOverdueVisits } from '@/server/actions/overdue'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

export default async function OverduePage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>
}) {
  const { orgSlug, studySlug } = await params
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select('id, name')
    .eq('slug', studySlug)
    .single()

  if (!study) {
    redirect('/select-study')
  }

  const overdueVisits = await getOverdueVisits(study.id)
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`${basePath}/dashboard`}
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <span>Overdue Visits</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Overdue Visits</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visits that have passed their window without completion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue</CardTitle>
          <CardDescription>
            {overdueVisits.length} overdue visit{overdueVisits.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overdueVisits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No overdue visits. All visits are on schedule.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-center">Due Date</TableHead>
                  <TableHead className="text-center">Window End</TableHead>
                  <TableHead className="text-center">Days Overdue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueVisits.map((visit) => (
                  <TableRow key={`${visit.participantId}-${visit.eventId}`}>
                    <TableCell className="font-medium">
                      {visit.participantNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {visit.eventName}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {new Date(visit.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {new Date(visit.windowEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          visit.daysOverdue > 14
                            ? 'bg-red-100 text-red-800'
                            : visit.daysOverdue > 7
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {visit.daysOverdue}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`${basePath}/participants/${visit.participantId}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
