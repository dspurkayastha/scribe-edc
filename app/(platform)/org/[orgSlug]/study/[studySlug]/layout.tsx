import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, getUserMemberships } from "@/lib/auth/session";
import { StudyContextProvider } from "@/components/layout/study-context-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default async function StudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const user = await requireAuth();
  const { orgSlug, studySlug } = await params;
  const supabase = await createClient();

  // Fetch study and organization
  const { data: study } = await supabase
    .from("studies")
    .select(`
      id,
      slug,
      name,
      description,
      organizations (
        id,
        slug,
        name
      )
    `)
    .eq("slug", studySlug)
    .single();

  if (!study) {
    redirect("/select-study");
  }

  const org = study.organizations as any;
  if (org.slug !== orgSlug) {
    redirect("/select-study");
  }

  // Get user memberships from JWT
  const memberships = await getUserMemberships();
  const userMembership = memberships.find(
    (m) => m.study_id === study.id && m.is_active
  );

  if (!userMembership) {
    redirect("/select-study");
  }

  return (
    <StudyContextProvider
      study={study}
      organization={org}
      userMembership={userMembership}
    >
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <Breadcrumbs />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </StudyContextProvider>
  );
}
