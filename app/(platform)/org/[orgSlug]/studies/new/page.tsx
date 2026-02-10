'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createOrganization } from '@/server/actions/organization'
import { createStudy, createStudyArm, createStudySite } from '@/server/actions/study'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Step = 'info' | 'arms' | 'sites' | 'done'

const STUDY_TYPES = [
  { value: 'parallel_rct', label: 'Parallel-Group RCT' },
  { value: 'single_arm', label: 'Single Arm' },
  { value: 'observational', label: 'Observational Cohort' },
  { value: 'case_control', label: 'Case-Control' },
  { value: 'crossover_rct', label: 'Cross-Over RCT' },
  { value: 'registry', label: 'Registry' },
] as const

export default function NewStudyPage() {
  const router = useRouter()
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const [step, setStep] = useState<Step>('info')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Study info
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [slug, setSlug] = useState('')
  const [idPrefix, setIdPrefix] = useState('')
  const [studyType, setStudyType] = useState('parallel_rct')
  const [targetSample, setTargetSample] = useState('')
  const [protocolId, setProtocolId] = useState('')
  const [studyId, setStudyId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  // Arms
  const [arms, setArms] = useState([{ name: 'Control', label: 'Control' }])

  // Sites
  const [sites, setSites] = useState([{ name: 'Main Site', code: 'MAIN' }])

  async function handleCreateStudy() {
    setError(null)
    setLoading(true)

    try {
      // First ensure org exists (or get its ID)
      let finalOrgId = orgId
      if (!finalOrgId) {
        const orgResult = await createOrganization({ name: orgSlug, slug: orgSlug })
        if (orgResult.success) {
          finalOrgId = orgResult.data.id
          setOrgId(finalOrgId)
        } else {
          // Org might already exist - that's ok, we'll get it from the study creation
          // Try with a placeholder - the server will resolve it
        }
      }

      if (!finalOrgId) {
        setError('Could not resolve organization')
        setLoading(false)
        return
      }

      const result = await createStudy({
        organizationId: finalOrgId,
        name,
        shortName,
        slug,
        idPrefix: idPrefix.toUpperCase(),
        studyType: studyType as any,
        targetSample: targetSample ? parseInt(targetSample) : undefined,
        protocolId: protocolId || undefined,
      })

      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }

      setStudyId(result.data.id)
      setStep('arms')
    } catch (e) {
      setError('An unexpected error occurred')
    }
    setLoading(false)
  }

  async function handleCreateArms() {
    if (!studyId) return
    setError(null)
    setLoading(true)

    for (const arm of arms) {
      if (arm.name) {
        const result = await createStudyArm(studyId, { name: arm.name, label: arm.label })
        if (!result.success) {
          setError(result.error)
          setLoading(false)
          return
        }
      }
    }

    setStep('sites')
    setLoading(false)
  }

  async function handleCreateSites() {
    if (!studyId) return
    setError(null)
    setLoading(true)

    for (const site of sites) {
      if (site.name && site.code) {
        const result = await createStudySite(studyId, { name: site.name, code: site.code.toUpperCase() })
        if (!result.success) {
          setError(result.error)
          setLoading(false)
          return
        }
      }
    }

    setStep('done')
    setLoading(false)
    router.push(`/org/${orgSlug}/study/${slug}/dashboard`)
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 px-4 pt-20">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create New Study</CardTitle>
          <CardDescription>
            {step === 'info' && 'Step 1: Basic Information'}
            {step === 'arms' && 'Step 2: Study Arms'}
            {step === 'sites' && 'Step 3: Study Sites'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {step === 'info' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Study Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Research Study" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shortName">Short Name</Label>
                  <Input id="shortName" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="MRS" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idPrefix">ID Prefix</Label>
                  <Input id="idPrefix" value={idPrefix} onChange={(e) => setIdPrefix(e.target.value.toUpperCase())} placeholder="MRS" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="my-study" required />
              </div>
              <div className="space-y-2">
                <Label>Study Type</Label>
                <Select value={studyType} onValueChange={setStudyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STUDY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetSample">Target Sample Size</Label>
                  <Input id="targetSample" type="number" value={targetSample} onChange={(e) => setTargetSample(e.target.value)} placeholder="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protocolId">Protocol ID</Label>
                  <Input id="protocolId" value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="NCT12345678" />
                </div>
              </div>
              <Button onClick={handleCreateStudy} disabled={loading || !name || !shortName || !slug || !idPrefix} className="w-full">
                {loading ? 'Creating...' : 'Create Study & Continue'}
              </Button>
            </>
          )}

          {step === 'arms' && (
            <>
              {arms.map((arm, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input value={arm.name} onChange={(e) => {
                    const next = [...arms]
                    next[i] = { ...next[i], name: e.target.value }
                    setArms(next)
                  }} placeholder="Arm name" />
                  <Input value={arm.label} onChange={(e) => {
                    const next = [...arms]
                    next[i] = { ...next[i], label: e.target.value }
                    setArms(next)
                  }} placeholder="Arm label" />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setArms([...arms, { name: '', label: '' }])}>
                Add Arm
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('sites')}>Skip</Button>
                <Button onClick={handleCreateArms} disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Save Arms & Continue'}
                </Button>
              </div>
            </>
          )}

          {step === 'sites' && (
            <>
              {sites.map((site, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input value={site.name} onChange={(e) => {
                    const next = [...sites]
                    next[i] = { ...next[i], name: e.target.value }
                    setSites(next)
                  }} placeholder="Site name" />
                  <Input value={site.code} onChange={(e) => {
                    const next = [...sites]
                    next[i] = { ...next[i], code: e.target.value.toUpperCase() }
                    setSites(next)
                  }} placeholder="Code (e.g., MH)" />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setSites([...sites, { name: '', code: '' }])}>
                Add Site
              </Button>
              <Button onClick={handleCreateSites} disabled={loading} className="w-full">
                {loading ? 'Finishing...' : 'Finish Setup'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
