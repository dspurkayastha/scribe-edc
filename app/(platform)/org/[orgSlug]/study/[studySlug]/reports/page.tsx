import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExportForm } from "@/components/reports/export-form";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { studySlug } = await params;
  const supabase = await createClient();

  const { data: study } = await supabase
    .from("studies")
    .select("id")
    .eq("slug", studySlug)
    .single();

  if (!study) redirect("/select-study");

  // Fetch active form definitions for this study
  // Select the latest version of each unique slug
  const { data: formDefs } = await supabase
    .from("form_definitions")
    .select("id, slug, title, version")
    .eq("study_id", study.id)
    .eq("is_active", true)
    .order("title", { ascending: true });

  const forms = (formDefs ?? []).map((f) => ({
    id: f.id as string,
    slug: f.slug as string,
    title: f.title as string,
    version: f.version as number,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
        <p className="text-sm text-muted-foreground">
          Export study data in CSV or JSON format for analysis
        </p>
      </div>

      <ExportForm studyId={study.id} forms={forms} />
    </div>
  );
}
