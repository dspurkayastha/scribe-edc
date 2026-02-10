export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Study dashboard for {studySlug} in organization {orgSlug}.
      </p>
    </div>
  );
}
