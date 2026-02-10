export default async function FormDefinitionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Form Definitions</h1>
      <p className="text-muted-foreground">
        Manage form definitions for study {studySlug}.
      </p>
    </div>
  );
}
