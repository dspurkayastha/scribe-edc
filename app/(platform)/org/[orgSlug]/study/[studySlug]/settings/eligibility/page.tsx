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
import type { EligibilityCriteriaRow } from '@/types/database'
import { EligibilityCriteriaPanel } from '@/components/settings/eligibility-criteria-panel'

export default async function EligibilityPage({
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

  const { data: criteria } = await supabase
    .from('eligibility_criteria')
    .select('*')
    .eq('study_id', study.id)
    .order('sort_order', { ascending: true })

  const criteriaRows = (criteria ?? []) as EligibilityCriteriaRow[]
  const basePath = `/org/${orgSlug}/study/${studySlug}`

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
          <span>Eligibility Criteria</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Eligibility Criteria</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define inclusion and exclusion criteria for participant enrollment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criteria</CardTitle>
          <CardDescription>
            {criteriaRows.length} criteria defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EligibilityCriteriaPanel studyId={study.id} criteria={criteriaRows} />
        </CardContent>
      </Card>
    </div>
  )
}
