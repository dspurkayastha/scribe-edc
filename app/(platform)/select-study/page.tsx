import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, ArrowRight } from "lucide-react";
import { CreateOrganizationDialog } from "@/components/organization/create-organization-dialog";

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
        short_name,
        organizations (
          id,
          slug,
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Collect unique orgs so we can link to the correct wizard route
  const orgSlugs = new Set<string>();
  if (studies) {
    for (const member of studies) {
      const study = member.studies as any;
      if (study?.organizations?.slug) {
        orgSlugs.add(study.organizations.slug);
      }
    }
  }
  const firstOrgSlug = orgSlugs.size > 0 ? [...orgSlugs][0] : null;

  if (!studies || studies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {firstOrgSlug ? (
            /* User has an org but no studies -- direct them to the study wizard */
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Create Your First Study</CardTitle>
                <CardDescription>
                  You belong to an organization but have no active studies yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Link href={`/org/${firstOrgSlug}/studies/new`}>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Study
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            /* User has NO org at all -- prominent onboarding path */
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Get Started</CardTitle>
                <CardDescription>
                  Create your organization to begin setting up clinical studies.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <CreateOrganizationDialog
                  trigger={
                    <Button className="w-full">
                      <Building2 className="mr-2 h-4 w-4" />
                      Create Your Organization
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </Button>
                  }
                />
                <p className="text-center text-xs text-muted-foreground">
                  After creating an organization you will be guided to set up your first study.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Select a Study</h1>
        <div className="flex items-center gap-2">
          <CreateOrganizationDialog
            trigger={
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                New Organization
              </Button>
            }
          />
          {firstOrgSlug && (
            <Link href={`/org/${firstOrgSlug}/studies/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Study
              </Button>
            </Link>
          )}
        </div>
      </div>
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
                    {org.name}
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
