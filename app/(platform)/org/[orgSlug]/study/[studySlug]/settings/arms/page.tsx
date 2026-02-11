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
import type { StudyArmRow, StudySiteRow } from "@/types/database";
import { AddArmDialog } from "@/components/settings/add-arm-dialog";
import { AddSiteDialog } from "@/components/settings/add-site-dialog";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";

export default async function ArmsPage({
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

  // Fetch arms and sites in parallel
  const [armsResult, sitesResult] = await Promise.all([
    supabase
      .from("study_arms")
      .select("*")
      .eq("study_id", study.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("study_sites")
      .select("*")
      .eq("study_id", study.id)
      .order("name", { ascending: true }),
  ]);

  const armRows = (armsResult.data ?? []) as StudyArmRow[];
  const siteRows = (sitesResult.data ?? []) as StudySiteRow[];
  const basePath = `/org/${orgSlug}/study/${studySlug}`;

  // Calculate total allocation for ratio display
  const totalAllocation = armRows.reduce((sum, arm) => sum + arm.allocation, 0);

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
          <span>Arms & Sites</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Arms & Sites
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Study treatment arms and participating sites
        </p>
      </div>

      {/* Arms Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Study Arms</CardTitle>
              <CardDescription>
                {armRows.length} arm{armRows.length !== 1 ? "s" : ""} configured
                {totalAllocation > 0 && armRows.length > 1 && (
                  <span className="ml-1">
                    (allocation ratio{" "}
                    {armRows.map((a) => a.allocation).join(":")}
                    )
                  </span>
                )}
              </CardDescription>
            </div>
            <AddArmDialog studyId={study.id} />
          </div>
        </CardHeader>
        <CardContent>
          {armRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No study arms have been defined yet.</p>
              <p className="text-xs mt-1">
                Arms define the treatment groups for randomized studies.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-center">
                    Allocation Ratio
                  </TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {armRows.map((arm) => (
                  <TableRow key={arm.id}>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {arm.sort_order}
                    </TableCell>
                    <TableCell className="font-medium">{arm.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {arm.label}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {arm.allocation}
                      {totalAllocation > 0 && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (
                          {Math.round(
                            (arm.allocation / totalAllocation) * 100
                          )}
                          %)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          arm.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {arm.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleActiveButton
                        entityType="arm"
                        entityId={arm.id}
                        studyId={study.id}
                        isActive={arm.is_active}
                        entityName={arm.label}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sites Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Study Sites</CardTitle>
              <CardDescription>
                {siteRows.length} site{siteRows.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </div>
            <AddSiteDialog studyId={study.id} />
          </div>
        </CardHeader>
        <CardContent>
          {siteRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                No study sites have been configured yet.
              </p>
              <p className="text-xs mt-1">
                Sites represent the participating institutions or clinics.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteRows.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {site.code}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          site.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {site.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ToggleActiveButton
                        entityType="site"
                        entityId={site.id}
                        studyId={study.id}
                        isActive={site.is_active}
                        entityName={site.name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
