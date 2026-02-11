import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listParticipants } from '@/server/actions/participants'
import { EnrollDialog } from '@/components/participants/enroll-dialog'
import { StatusBadge } from '@/components/participants/status-change-dropdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon, UsersIcon } from 'lucide-react'
import type { ParticipantStatus } from '@/types/database'

const ALL_STATUSES: { value: ParticipantStatus; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Ineligible' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'randomized', label: 'Randomized' },
  { value: 'on_treatment', label: 'On Treatment' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'lost_to_followup', label: 'Lost to Follow-up' },
  { value: 'screen_failure', label: 'Screen Failure' },
]

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}) {
  const { orgSlug, studySlug } = await params
  const sp = await searchParams
  const supabase = await createClient()

  // Resolve study from slug
  const { data: study } = await supabase
    .from('studies')
    .select('id, name')
    .eq('slug', studySlug)
    .single()

  if (!study) redirect('/select-study')

  // Fetch sites for enroll dialog and site name display
  const { data: sites } = await supabase
    .from('study_sites')
    .select('id, name, code')
    .eq('study_id', study.id)
    .eq('is_active', true)
    .order('code')

  const siteMap = new Map((sites ?? []).map((s) => [s.id, s]))

  // Parse search params
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const statusFilter = sp.status || undefined
  const searchQuery = sp.search || undefined

  // Fetch participants
  const result = await listParticipants(study.id, {
    page,
    pageSize: 25,
    status: statusFilter,
    search: searchQuery,
  })

  // Build URL helper for filters/pagination
  function buildUrl(overrides: Record<string, string | undefined>) {
    const base = `/org/${orgSlug}/study/${studySlug}/participants`
    const p = new URLSearchParams()
    const merged = {
      page: String(page),
      status: statusFilter,
      search: searchQuery,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== '1' || k !== 'page' && v) {
        if (k === 'page' && v === '1') continue
        if (v) p.set(k, v)
      }
    }
    const qs = p.toString()
    return qs ? `${base}?${qs}` : base
  }

  const basePath = `/org/${orgSlug}/study/${studySlug}/participants`

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Participants</h1>
            <p className="text-sm text-muted-foreground">
              {result.total} participant{result.total !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <EnrollDialog studyId={study.id} sites={sites ?? []} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <form action={basePath} method="get" className="flex-1 flex gap-2">
              {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search by study number..."
                  defaultValue={searchQuery ?? ''}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {(searchQuery || statusFilter) && (
                <Button variant="ghost" asChild>
                  <Link href={basePath}>Clear</Link>
                </Button>
              )}
            </form>

            {/* Status filter */}
            <div className="flex gap-2 flex-wrap">
              <Link
                href={buildUrl({ status: undefined, page: '1' })}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  !statusFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All
              </Link>
              {ALL_STATUSES.map((s) => (
                <Link
                  key={s.value}
                  href={buildUrl({ status: s.value, page: '1' })}
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === s.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No participants found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by enrolling your first participant.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Study Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Enrolled Date</TableHead>
                  <TableHead>Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((participant) => {
                  const site = participant.site_id ? siteMap.get(participant.site_id) : null
                  return (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <Link
                          href={`/org/${orgSlug}/study/${studySlug}/participants/${participant.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {participant.study_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={participant.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {site ? `${site.code} - ${site.name}` : '--'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {participant.enrolled_at
                          ? new Date(participant.enrolled_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '--'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(participant.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {result.page} of {result.totalPages}
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildUrl({ page: String(result.page - 1) })}>
                    <ChevronLeftIcon />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeftIcon />
                  Previous
                </Button>
              )}
              {result.page < result.totalPages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={buildUrl({ page: String(result.page + 1) })}>
                    Next
                    <ChevronRightIcon />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRightIcon />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
