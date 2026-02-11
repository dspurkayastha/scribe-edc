import { redirect } from 'next/navigation'
import { getOrganization } from '@/server/actions/organization'
import { CreateStudyWizard } from '@/components/study/create-study-wizard'

interface PageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function NewStudyPage({ params }: PageProps) {
  const { orgSlug } = await params

  const org = await getOrganization(orgSlug)

  if (!org) {
    redirect('/select-study')
  }

  return <CreateStudyWizard orgSlug={orgSlug} orgId={org.id} />
}
