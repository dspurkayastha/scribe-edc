export default async function FormPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    studySlug: string;
    participantId: string;
    formSlug: string;
  }>;
}) {
  const { orgSlug, studySlug, participantId, formSlug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Form</h1>
      <p className="text-muted-foreground">
        Form {formSlug} for participant {participantId} in study {studySlug}.
      </p>
    </div>
  );
}
