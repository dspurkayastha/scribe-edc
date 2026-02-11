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
import type { OptionListRow } from '@/types/database'
import { CreateOptionListDialog } from '@/components/form-builder/create-option-list-dialog'
import { EditOptionListDialog } from '@/components/form-builder/edit-option-list-dialog'

export default async function OptionListsPage({
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

  if (!study) redirect('/select-study')

  const { data: optionLists } = await supabase
    .from('option_lists')
    .select('*')
    .or(`study_id.eq.${study.id},study_id.is.null`)
    .order('label', { ascending: true })

  const lists = (optionLists ?? []) as OptionListRow[]
  const basePath = `/org/${orgSlug}/study/${studySlug}`

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href={`${basePath}/settings`} className="hover:text-foreground transition-colors">
            Settings
          </Link>
          <span>/</span>
          <Link href={`${basePath}/settings/forms`} className="hover:text-foreground transition-colors">
            Forms
          </Link>
          <span>/</span>
          <span>Option Lists</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Option Lists</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Reusable option lists shared across form fields (e.g. countries, medications).
            </p>
          </div>
          <CreateOptionListDialog studyId={study.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Option Lists</CardTitle>
          <CardDescription>
            {lists.length} option list{lists.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No option lists defined yet.</p>
              <p className="text-xs mt-1">
                Create shared option lists that can be referenced from form fields.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Options</TableHead>
                  <TableHead className="text-center">Searchable</TableHead>
                  <TableHead className="text-center">Scope</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {list.slug}
                    </TableCell>
                    <TableCell className="text-center">{list.options.length}</TableCell>
                    <TableCell className="text-center">
                      {list.is_searchable ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {list.study_id ? 'Study' : 'Global'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {list.study_id && (
                        <EditOptionListDialog optionList={list} studyId={study.id} />
                      )}
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
