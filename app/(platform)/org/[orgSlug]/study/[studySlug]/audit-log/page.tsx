export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Audit Log</h1>
      <p className="text-muted-foreground">
        View audit trail for study {studySlug}.
      </p>
    </div>
  );
}
