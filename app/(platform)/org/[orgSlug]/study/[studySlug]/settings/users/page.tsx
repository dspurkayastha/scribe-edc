import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { MemberRole } from "@/types/database";
import { AddMemberDialog } from "@/components/settings/add-member-dialog";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { RoleChangeSelect } from "@/components/settings/role-change-select";

const ROLE_STYLES: Record<MemberRole, string> = {
  pi: "bg-purple-100 text-purple-800",
  co_investigator: "bg-blue-100 text-blue-800",
  data_entry: "bg-green-100 text-green-800",
  monitor: "bg-orange-100 text-orange-800",
  read_only: "bg-gray-100 text-gray-600",
};

const ROLE_LABELS: Record<MemberRole, string> = {
  pi: "PI",
  co_investigator: "Co-Investigator",
  data_entry: "Data Entry",
  monitor: "Monitor",
  read_only: "Read Only",
};

interface MemberWithProfile {
  id: string;
  study_id: string;
  user_id: string;
  site_id: string | null;
  role: MemberRole;
  is_active: boolean;
  created_at: string;
  user_profiles: {
    email: string;
    full_name: string;
  } | null;
  study_sites: {
    name: string;
    code: string;
  } | null;
}

interface SiteForSelect {
  id: string;
  name: string;
  code: string;
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;
  const supabase = await createClient();

  // Resolve study ID from slug
  const { data: study } = await supabase
    .from("studies")
    .select("id, name, organizations!inner(slug)")
    .eq("organizations.slug", orgSlug)
    .eq("slug", studySlug)
    .single();

  if (!study) {
    redirect("/select-study");
  }

  // Fetch study members with user profiles and site info, and sites for the dropdown
  const [membersResult, sitesResult] = await Promise.all([
    supabase
      .from("study_members")
      .select("*, user_profiles(email, full_name), study_sites(name, code)")
      .eq("study_id", study.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("study_sites")
      .select("id, name, code")
      .eq("study_id", study.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const memberRows = (membersResult.data ?? []) as MemberWithProfile[];
  const sites = (sitesResult.data ?? []) as SiteForSelect[];
  const basePath = `/org/${orgSlug}/study/${studySlug}`;

  // Count by role for the summary
  const activeMemberRows = memberRows.filter((m) => m.is_active);
  const roleCounts = activeMemberRows.reduce(
    (acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`${basePath}/settings`}
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span>/</span>
          <span>Users</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Users assigned to this study and their roles
        </p>
      </div>

      {/* Role summary badges */}
      {activeMemberRows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleCounts).map(([role, count]) => (
            <Badge
              key={role}
              variant="outline"
              className={ROLE_STYLES[role as MemberRole]}
            >
              {ROLE_LABELS[role as MemberRole] ?? role}: {count}
            </Badge>
          ))}
          <Badge variant="secondary">
            {activeMemberRows.length} total
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {memberRows.length} member{memberRows.length !== 1 ? "s" : ""}{" "}
                assigned to this study
              </CardDescription>
            </div>
            <AddMemberDialog studyId={study.id} sites={sites} />
          </div>
        </CardHeader>
        <CardContent>
          {memberRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No team members have been added yet.</p>
              <p className="text-xs mt-1">
                Invite collaborators to begin working on this study.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((member) => {
                  const profile = member.user_profiles;
                  const site = member.study_sites;
                  const displayName = profile
                    ? profile.full_name || profile.email
                    : member.user_id;

                  return (
                    <TableRow key={member.id} className={!member.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        {profile ? (
                          <div>
                            <div className="font-medium">
                              {profile.full_name || profile.email}
                            </div>
                            {profile.full_name && (
                              <div className="text-xs text-muted-foreground">
                                {profile.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-muted-foreground">
                            {member.user_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <RoleChangeSelect
                            memberId={member.id}
                            studyId={study.id}
                            currentRole={member.role}
                          />
                        ) : (
                          <Badge
                            variant="outline"
                            className={ROLE_STYLES[member.role]}
                          >
                            {ROLE_LABELS[member.role] ?? member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {site ? (
                          <span>
                            {site.name}{" "}
                            <span className="text-muted-foreground text-xs font-mono">
                              ({site.code})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            All sites
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            member.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {member.is_active ? "Active" : "Removed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.is_active && (
                          <ToggleActiveButton
                            entityType="member"
                            entityId={member.id}
                            studyId={study.id}
                            isActive={member.is_active}
                            entityName={displayName}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
