'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createStudy, createStudyArm, createStudySite } from '@/server/actions/study'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  FlaskConical,
  Eye,
  Syringe,
  FileText,
} from 'lucide-react'

// ─── Types ───

type WizardStep = 'template' | 'info' | 'arms' | 'sites' | 'confirm'

interface ArmEntry {
  name: string
  label: string
  allocation: number
}

interface SiteEntry {
  name: string
  code: string
}

interface TemplateOption {
  id: string
  name: string
  description: string
  studyType: string
  icon: React.ReactNode
  arms: ArmEntry[]
}

// ─── Constants ───

const STUDY_TYPES = [
  { value: 'parallel_rct', label: 'Parallel-Group RCT' },
  { value: 'single_arm', label: 'Single Arm' },
  { value: 'observational', label: 'Observational Cohort' },
  { value: 'case_control', label: 'Case-Control' },
  { value: 'crossover_rct', label: 'Cross-Over RCT' },
  { value: 'registry', label: 'Registry' },
] as const

const TEMPLATES: TemplateOption[] = [
  {
    id: 'parallel-rct',
    name: 'Parallel-Group RCT',
    description: 'A two-arm parallel-group randomized controlled trial with standard visit schedule.',
    studyType: 'parallel_rct',
    icon: <FlaskConical className="h-6 w-6" />,
    arms: [
      { name: 'Control', label: 'Standard Treatment', allocation: 1 },
      { name: 'Experimental', label: 'Experimental Treatment', allocation: 1 },
    ],
  },
  {
    id: 'observational',
    name: 'Observational Cohort',
    description: 'A prospective observational cohort study with periodic follow-up.',
    studyType: 'observational',
    icon: <Eye className="h-6 w-6" />,
    arms: [],
  },
  {
    id: 'single-arm',
    name: 'Single-Arm Interventional',
    description: 'A single-arm interventional study with pre/post measurement.',
    studyType: 'single_arm',
    icon: <Syringe className="h-6 w-6" />,
    arms: [
      { name: 'Treatment', label: 'Treatment Group', allocation: 1 },
    ],
  },
  {
    id: 'blank',
    name: 'Start Blank',
    description: 'Configure everything from scratch with no pre-filled settings.',
    studyType: 'parallel_rct',
    icon: <FileText className="h-6 w-6" />,
    arms: [],
  },
]

const SKIPS_ARMS: string[] = ['observational', 'single_arm']

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function generatePrefix(shortName: string): string {
  return shortName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

// ─── Step Indicator ───

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { key: WizardStep; label: string }[]
  currentStep: WizardStep
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isComplete
                  ? 'bg-primary text-primary-foreground'
                  : isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isComplete ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-xs sm:inline ${
                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 h-px w-6 ${
                  isComplete ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Wizard ───

export function CreateStudyWizard({
  orgSlug,
  orgId,
}: {
  orgSlug: string
  orgId: string
}) {
  const router = useRouter()

  const [step, setStep] = useState<WizardStep>('template')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Study info
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [slug, setSlug] = useState('')
  const [idPrefix, setIdPrefix] = useState('')
  const [studyType, setStudyType] = useState('parallel_rct')
  const [targetSample, setTargetSample] = useState('')
  const [protocolId, setProtocolId] = useState('')

  // Arms
  const [arms, setArms] = useState<ArmEntry[]>([
    { name: 'Control', label: 'Control', allocation: 1 },
  ])

  // Sites
  const [sites, setSites] = useState<SiteEntry[]>([
    { name: '', code: '' },
  ])

  // Computed values
  const showArmsStep = !SKIPS_ARMS.includes(studyType)

  const visibleSteps: { key: WizardStep; label: string }[] = [
    { key: 'template', label: 'Template' },
    { key: 'info', label: 'Basic Info' },
    ...(showArmsStep ? [{ key: 'arms' as WizardStep, label: 'Arms' }] : []),
    { key: 'sites', label: 'Sites' },
    { key: 'confirm', label: 'Confirm' },
  ]

  // ─── Template Selection ───

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplate(templateId)
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (template && template.id !== 'blank') {
      setStudyType(template.studyType)
      if (template.arms.length > 0) {
        setArms(template.arms.map((a) => ({ ...a })))
      }
    }
    if (templateId === 'blank') {
      setStudyType('parallel_rct')
      setArms([{ name: 'Control', label: 'Control', allocation: 1 }])
    }
  }

  // ─── Navigation ───

  function getNextStep(current: WizardStep): WizardStep {
    if (current === 'template') return 'info'
    if (current === 'info') return showArmsStep ? 'arms' : 'sites'
    if (current === 'arms') return 'sites'
    if (current === 'sites') return 'confirm'
    return 'confirm'
  }

  function getPrevStep(current: WizardStep): WizardStep {
    if (current === 'info') return 'template'
    if (current === 'arms') return 'info'
    if (current === 'sites') return showArmsStep ? 'arms' : 'info'
    if (current === 'confirm') return 'sites'
    return 'template'
  }

  function goNext() {
    setError(null)
    setStep(getNextStep(step))
  }

  function goBack() {
    setError(null)
    setStep(getPrevStep(step))
  }

  // ─── Name change handler with auto-slug ───

  const handleNameChange = useCallback((value: string) => {
    setName(value)
    setSlug(generateSlug(value))
  }, [])

  const handleShortNameChange = useCallback((value: string) => {
    setShortName(value)
    setIdPrefix(generatePrefix(value))
  }, [])

  // ─── Arms management ───

  function addArm() {
    setArms((prev) => [...prev, { name: '', label: '', allocation: 1 }])
  }

  function removeArm(index: number) {
    setArms((prev) => prev.filter((_, i) => i !== index))
  }

  function updateArm(index: number, field: keyof ArmEntry, value: string | number) {
    setArms((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // ─── Sites management ───

  function addSite() {
    setSites((prev) => [...prev, { name: '', code: '' }])
  }

  function removeSite(index: number) {
    setSites((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSite(index: number, field: keyof SiteEntry, value: string) {
    setSites((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // ─── Validation ───

  function isInfoValid() {
    return name.trim().length >= 2 && shortName.trim().length >= 1 && slug.length >= 2 && idPrefix.length >= 1
  }

  function isArmsValid() {
    return arms.length > 0 && arms.every((a) => a.name.trim().length > 0 && a.label.trim().length > 0)
  }

  function hasSites() {
    return sites.some((s) => s.name.trim().length > 0 && s.code.trim().length > 0)
  }

  // ─── Final submission ───

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    try {
      // 1. Create the study
      const studyResult = await createStudy({
        organizationId: orgId,
        name: name.trim(),
        shortName: shortName.trim(),
        slug,
        idPrefix: idPrefix.toUpperCase(),
        studyType: studyType as any,
        targetSample: targetSample ? parseInt(targetSample, 10) : undefined,
        protocolId: protocolId.trim() || undefined,
      })

      if (!studyResult.success) {
        setError(studyResult.error)
        setLoading(false)
        return
      }

      const studyId = studyResult.data.id

      // 2. Create arms (if applicable)
      if (showArmsStep) {
        for (const arm of arms) {
          if (arm.name.trim()) {
            const armResult = await createStudyArm(studyId, {
              name: arm.name.trim(),
              label: arm.label.trim(),
              allocation: arm.allocation,
            })
            if (!armResult.success) {
              setError(`Study created but failed to add arm "${arm.name}": ${armResult.error}`)
              setLoading(false)
              return
            }
          }
        }
      }

      // 3. Create sites
      const validSites = sites.filter((s) => s.name.trim() && s.code.trim())
      for (const site of validSites) {
        const siteResult = await createStudySite(studyId, {
          name: site.name.trim(),
          code: site.code.toUpperCase().trim(),
        })
        if (!siteResult.success) {
          setError(`Study created but failed to add site "${site.name}": ${siteResult.error}`)
          setLoading(false)
          return
        }
      }

      // 4. Redirect to the new study dashboard
      router.push(`/org/${orgSlug}/study/${slug}/dashboard`)
    } catch (e) {
      setError('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  // ─── Render ───

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 px-4 pt-12 pb-12">
      <div className="w-full max-w-2xl">
        <StepIndicator steps={visibleSteps} currentStep={step} />

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'template' && 'Choose a Template'}
              {step === 'info' && 'Basic Information'}
              {step === 'arms' && 'Treatment Arms'}
              {step === 'sites' && 'Study Sites'}
              {step === 'confirm' && 'Review & Create'}
            </CardTitle>
            <CardDescription>
              {step === 'template' && 'Start from a template or create a blank study.'}
              {step === 'info' && 'Enter the core study details.'}
              {step === 'arms' && 'Define the treatment arms and allocation ratios.'}
              {step === 'sites' && 'Add the sites participating in this study.'}
              {step === 'confirm' && 'Review your settings before creating the study.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ────── Step: Template ────── */}
            {step === 'template' && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">{template.icon}</div>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={goNext} disabled={!selectedTemplate}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* ────── Step: Basic Info ────── */}
            {step === 'info' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Study Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Aspirin Cardiovascular Outcomes Trial"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shortName">Short Name *</Label>
                    <Input
                      id="shortName"
                      value={shortName}
                      onChange={(e) => handleShortNameChange(e.target.value)}
                      placeholder="e.g. ACOT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idPrefix">ID Prefix *</Label>
                    <Input
                      id="idPrefix"
                      value={idPrefix}
                      onChange={(e) => setIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                      placeholder="e.g. ACOT"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="auto-generated-from-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will appear in the URL: /org/{orgSlug}/study/<span className="font-mono">{slug || '...'}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Study Type *</Label>
                  <Select value={studyType} onValueChange={setStudyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetSample">Target Sample Size</Label>
                    <Input
                      id="targetSample"
                      type="number"
                      min={1}
                      value={targetSample}
                      onChange={(e) => setTargetSample(e.target.value)}
                      placeholder="e.g. 200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protocolId">Protocol ID</Label>
                    <Input
                      id="protocolId"
                      value={protocolId}
                      onChange={(e) => setProtocolId(e.target.value)}
                      placeholder="e.g. NCT12345678"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext} disabled={!isInfoValid()}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* ────── Step: Arms ────── */}
            {step === 'arms' && (
              <>
                <div className="space-y-3">
                  {arms.map((arm, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <div className="grid flex-1 grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input
                            value={arm.name}
                            onChange={(e) => updateArm(i, 'name', e.target.value)}
                            placeholder="e.g. Control"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Label *</Label>
                          <Input
                            value={arm.label}
                            onChange={(e) => updateArm(i, 'label', e.target.value)}
                            placeholder="e.g. Standard Treatment"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Allocation Ratio</Label>
                          <Input
                            type="number"
                            min={1}
                            value={arm.allocation}
                            onChange={(e) => updateArm(i, 'allocation', parseInt(e.target.value, 10) || 1)}
                          />
                        </div>
                      </div>
                      {arms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeArm(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addArm}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Arm
                </Button>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext} disabled={!isArmsValid()}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* ────── Step: Sites ────── */}
            {step === 'sites' && (
              <>
                <div className="space-y-3">
                  {sites.map((site, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <div className="grid flex-1 grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Site Name</Label>
                          <Input
                            value={site.name}
                            onChange={(e) => updateSite(i, 'name', e.target.value)}
                            placeholder="e.g. Johns Hopkins Hospital"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Site Code</Label>
                          <Input
                            value={site.code}
                            onChange={(e) => updateSite(i, 'code', e.target.value.toUpperCase())}
                            placeholder="e.g. JHH"
                          />
                        </div>
                      </div>
                      {sites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSite(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSite}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Site
                </Button>

                <p className="text-xs text-muted-foreground">
                  Sites are optional. You can add them later from the study settings.
                </p>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* ────── Step: Confirm ────── */}
            {step === 'confirm' && (
              <>
                <div className="space-y-4">
                  {/* Study Info Summary */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Study Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">Short Name</span>
                      <span className="font-medium">{shortName}</span>
                      <span className="text-muted-foreground">URL Slug</span>
                      <span className="font-mono text-xs">{slug}</span>
                      <span className="text-muted-foreground">ID Prefix</span>
                      <span className="font-mono text-xs">{idPrefix}</span>
                      <span className="text-muted-foreground">Type</span>
                      <span>{STUDY_TYPES.find((t) => t.value === studyType)?.label}</span>
                      {targetSample && (
                        <>
                          <span className="text-muted-foreground">Target Sample</span>
                          <span>{targetSample}</span>
                        </>
                      )}
                      {protocolId && (
                        <>
                          <span className="text-muted-foreground">Protocol ID</span>
                          <span>{protocolId}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Arms Summary */}
                  {showArmsStep && arms.length > 0 && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Treatment Arms ({arms.length})
                      </h3>
                      <div className="space-y-1">
                        {arms.map((arm, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              <span className="font-medium">{arm.name}</span>
                              <span className="text-muted-foreground ml-2">({arm.label})</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Ratio: {arm.allocation}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sites Summary */}
                  {hasSites() && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Sites ({sites.filter((s) => s.name.trim() && s.code.trim()).length})
                      </h3>
                      <div className="space-y-1">
                        {sites
                          .filter((s) => s.name.trim() && s.code.trim())
                          .map((site, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="font-medium">{site.name}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {site.code}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {!hasSites() && (
                    <div className="rounded-lg border border-dashed p-4">
                      <p className="text-sm text-muted-foreground text-center">
                        No sites configured. You can add them later.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      'Creating Study...'
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Create Study
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
