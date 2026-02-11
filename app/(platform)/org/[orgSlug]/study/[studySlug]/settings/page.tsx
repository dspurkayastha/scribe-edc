import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserMemberships } from "@/lib/auth/session";
import { canEditStudyConfig } from "@/lib/auth/permissions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditStudySettingsDialog } from "@/components/settings/edit-study-settings-dialog";
import type { StudyRow, MemberRole } from "@/types/database";
import {
  FileText,
  CalendarDays,
  GitBranch,
  Users,
} from "lucide-react";

const STUDY_TYPE_LABELS: Record<string, string> = {
  parallel_rct: "Parallel RCT",
  crossover_rct: "Crossover RCT",
  factorial: "Factorial",
  cluster_rct: "Cluster RCT",
  single_arm: "Single Arm",
  observational: "Observational",
  case_control: "Case-Control",
  registry: "Registry",
};

const STATUS_VARIANT: Record<string, string> = {
  setup: "bg-yellow-100 text-yellow-800",
  recruiting: "bg-green-100 text-green-800",
  paused: "bg-orange-100 text-orange-800",
  closed: "bg-red-100 text-red-800",
  archived: "bg-gray-100 text-gray-800",
};

const BLINDING_LABELS: Record<string, string> = {
  open_label: "Open Label",
  single_blind: "Single Blind",
  double_blind: "Double Blind",
  triple_blind: "Triple Blind",
  none: "None / Not Applicable",
};

const PHASE_LABELS: Record<string, string> = {
  phase_1: "Phase I",
  phase_1_2: "Phase I/II",
  phase_2: "Phase II",
  phase_2_3: "Phase II/III",
  phase_3: "Phase III",
  phase_4: "Phase IV",
  not_applicable: "Not Applicable",
};

const subPages = [
  {
    title: "Forms",
    description: "Manage CRF form definitions and versions",
    href: "settings/forms",
    icon: FileText,
  },
  {
    title: "Events",
    description: "Configure study visits and event schedules",
    href: "settings/events",
    icon: CalendarDays,
  },
  {
    title: "Arms & Sites",
    description: "Study arms, allocation ratios, and site configuration",
    href: "settings/arms",
    icon: GitBranch,
  },
  {
    title: "Users",
    description: "Team members, roles, and site assignments",
    href: "settings/users",
    icon: Users,
  },
];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;
  const supabase = await createClient();

  const { data: study } = await supabase
    .from("studies")
    .select("*, organizations!inner(slug)")
    .eq("organizations.slug", orgSlug)
    .eq("slug", studySlug)
    .single();

  if (!study) {
    redirect("/select-study");
  }

  const s = study as StudyRow;
  const basePath = `/org/${orgSlug}/study/${studySlug}`;

  // Get user role to determine edit permissions
  const memberships = await getUserMemberships();
  const userMembership = memberships.find((m) => m.study_id === s.id);
  const userRole = userMembership?.role as MemberRole | undefined;
  const canEdit = userRole ? canEditStudyConfig(userRole) : false;

  // Extract settings-based fields
  const blinding = (s.settings as Record<string, unknown>)?.blinding as string | undefined;
  const phase = (s.settings as Record<string, unknown>)?.phase as string | undefined;

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Study Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configuration and management for {s.name}
        </p>
      </div>

      {/* Study Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Study Overview</CardTitle>
              <CardDescription>
                Core study identifiers and configuration
              </CardDescription>
            </div>
            {canEdit && <EditStudySettingsDialog study={s} />}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground font-medium">Name</dt>
              <dd className="mt-0.5">{s.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Short Name</dt>
              <dd className="mt-0.5">{s.short_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Protocol ID</dt>
              <dd className="mt-0.5">{s.protocol_id ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">ID Prefix</dt>
              <dd className="mt-0.5 font-mono">{s.id_prefix}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Study Type</dt>
              <dd className="mt-0.5">
                {STUDY_TYPE_LABELS[s.study_type] ?? s.study_type}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Status</dt>
              <dd className="mt-0.5">
                <Badge
                  variant="outline"
                  className={STATUS_VARIANT[s.status] ?? ""}
                >
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">
                Target Sample Size
              </dt>
              <dd className="mt-0.5">
                {s.target_sample != null
                  ? s.target_sample.toLocaleString()
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Blinding</dt>
              <dd className="mt-0.5">
                {blinding
                  ? BLINDING_LABELS[blinding] ?? blinding
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Phase</dt>
              <dd className="mt-0.5">
                {phase
                  ? PHASE_LABELS[phase] ?? phase
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-medium">Created</dt>
              <dd className="mt-0.5">
                {new Date(s.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subPages.map((page) => (
          <Link key={page.href} href={`${basePath}/${page.href}`}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <page.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    <CardDescription>{page.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
