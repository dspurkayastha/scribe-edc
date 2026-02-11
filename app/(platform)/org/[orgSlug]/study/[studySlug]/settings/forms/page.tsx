import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { FormDefinitionRow } from "@/types/database";
import { CreateFormDialog } from "@/components/form-builder/create-form-dialog";
import { FormActionsMenu } from "@/components/form-builder/form-actions-menu";
import { ImportCsvDialog } from "@/components/form-builder/import-csv-dialog";
import { ExportCsvButton } from "@/components/form-builder/export-csv-button";

export default async function FormDefinitionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;
  const supabase = await createClient();

  // Resolve study ID from slug
  const { data: study } = await supabase
    .from("studies")
    .select("id, name, organizations!inner(slug)")
    .eq("organizations.slug", orgSlug)
    .eq("slug", studySlug)
    .single();

  if (!study) {
    redirect("/select-study");
  }

  // Fetch form definitions for this study
  const { data: forms } = await supabase
    .from("form_definitions")
    .select("*")
    .eq("study_id", study.id)
    .order("title", { ascending: true });

  const formRows = (forms ?? []) as FormDefinitionRow[];
  const basePath = `/org/${orgSlug}/study/${studySlug}`;

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
          <span>Forms</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Form Definitions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Create and manage CRF form templates for this study.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCsvButton studyId={study.id} />
            <ImportCsvDialog studyId={study.id} />
            <CreateFormDialog studyId={study.id} basePath={basePath} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
          <CardDescription>
            {formRows.length} form{formRows.length !== 1 ? "s" : ""} defined
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No forms have been defined yet.</p>
              <p className="text-xs mt-1">
                Click &quot;Create Form&quot; to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formRows.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`${basePath}/settings/forms/${form.slug}/edit`}
                        className="hover:underline"
                      >
                        {form.title}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {form.slug}
                    </TableCell>
                    <TableCell className="text-center">
                      v{form.version}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Badge
                          variant="outline"
                          className={
                            form.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {form.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {form.is_locked && (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 text-amber-800"
                          >
                            Locked
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(form.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <FormActionsMenu
                        form={form}
                        studyId={study.id}
                        basePath={basePath}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
