export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string; participantId: string }>;
}) {
  const { orgSlug, studySlug, participantId } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Participant Detail</h1>
      <p className="text-muted-foreground">
        Viewing participant {participantId} in study {studySlug}.
      </p>
    </div>
  );
}
