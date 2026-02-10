export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Participants</h1>
      <p className="text-muted-foreground">
        Manage participants for study {studySlug}.
      </p>
    </div>
  );
}
