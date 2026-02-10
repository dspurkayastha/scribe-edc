export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Reports</h1>
      <p className="text-muted-foreground">
        View and generate reports for study {studySlug}.
      </p>
    </div>
  );
}
