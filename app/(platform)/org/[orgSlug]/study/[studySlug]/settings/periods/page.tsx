import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import type { StudyPeriodRow, PeriodType } from '@/types/database'
import { AddPeriodDialog } from '@/components/settings/add-period-dialog'
import { EditPeriodDialog } from '@/components/settings/edit-period-dialog'

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  treatment: 'Treatment',
  washout: 'Washout',
  run_in: 'Run-in',
  follow_up: 'Follow-up',
}

const PERIOD_TYPE_STYLES: Record<PeriodType, string> = {
  treatment: 'bg-blue-100 text-blue-800',
  washout: 'bg-amber-100 text-amber-800',
  run_in: 'bg-purple-100 text-purple-800',
  follow_up: 'bg-green-100 text-green-800',
}

export default async function PeriodsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>
}) {
  const { orgSlug, studySlug } = await params
  const supabase = await createClient()

  const { data: study } = await supabase
    .from('studies')
    .select('id, name, organizations!inner(slug)')
    .eq('organizations.slug', orgSlug)
    .eq('slug', studySlug)
    .single()

  if (!study) {
    redirect('/select-study')
  }

  const { data: periods } = await supabase
    .from('study_periods')
    .select('*')
    .eq('study_id', study.id)
    .order('sort_order', { ascending: true })

  const periodRows = (periods ?? []) as StudyPeriodRow[]
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  const nextSortOrder = periodRows.length > 0
    ? Math.max(...periodRows.map((p) => p.sort_order)) + 1
    : 1

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`${basePath}/settings`}
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span>/</span>
          <span>Periods</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Study Periods</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define study periods for crossover and multi-phase designs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Periods</CardTitle>
              <CardDescription>
                {periodRows.length} period{periodRows.length !== 1 ? 's' : ''} defined
              </CardDescription>
            </div>
            <AddPeriodDialog studyId={study.id} nextSortOrder={nextSortOrder} />
          </div>
        </CardHeader>
        <CardContent>
          {periodRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No periods have been defined yet.</p>
              <p className="text-xs mt-1">
                Periods are used in crossover and multi-phase study designs.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Duration</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodRows.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {period.sort_order}
                    </TableCell>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell className="text-muted-foreground">{period.label}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={PERIOD_TYPE_STYLES[period.period_type]}
                      >
                        {PERIOD_TYPE_LABELS[period.period_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {period.duration_days != null
                        ? `${period.duration_days}d`
                        : '\u2014'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          period.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {period.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditPeriodDialog period={period} studyId={study.id} />
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
