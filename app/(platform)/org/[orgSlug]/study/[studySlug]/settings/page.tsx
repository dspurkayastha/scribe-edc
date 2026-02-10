import { redirect } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;

  redirect(`/org/${orgSlug}/study/${studySlug}/settings/forms`);
}
