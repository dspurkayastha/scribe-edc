import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function SelectStudyPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: studies } = await supabase
    .from("study_members")
    .select(`
      study_id,
      is_active,
      studies (
        id,
        slug,
        name,
        description,
        organizations (
          id,
          slug,
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!studies || studies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">No Studies Found</h1>
          <p className="text-muted-foreground">
            You are not a member of any active studies.
          </p>
          <Link
            href="/create-study"
            className="text-primary hover:underline"
          >
            Create your first study
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Select a Study</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studies.map((member) => {
          const study = member.studies as any;
          const org = study.organizations as any;
          return (
            <Link
              key={study.id}
              href={`/org/${org.slug}/study/${study.slug}/dashboard`}
            >
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle>{study.name}</CardTitle>
                  <CardDescription>
                    {study.description || org.name}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
