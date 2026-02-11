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
        <h1 className="text-2xl font-semibold tracking-tight">
          Form Definitions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          CRF form templates configured for this study. Form builder coming in
          Phase 2.
        </p>
        <p className="text-muted-foreground text-xs mt-2 bg-muted px-3 py-2 rounded-md inline-block">
          Use the Supabase dashboard or CLI to manage form definitions until the visual form builder is available.
        </p>
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
                Form definitions will be created using the form builder in a
                future release.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Version</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Locked</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formRows.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      {form.slug}
                    </TableCell>
                    <TableCell className="text-center">
                      v{form.version}
                    </TableCell>
                    <TableCell className="text-center">
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
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          form.is_locked
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {form.is_locked ? "Locked" : "Unlocked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(form.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
