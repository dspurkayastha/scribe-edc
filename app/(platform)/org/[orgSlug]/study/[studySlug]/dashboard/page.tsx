import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardMetrics } from "@/server/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
}) {
  const { orgSlug, studySlug } = await params;
  const supabase = await createClient();

  const { data: study } = await supabase
    .from("studies")
    .select("id, name, short_name, status, target_sample, study_type, protocol_id")
    .eq("slug", studySlug)
    .single();

  if (!study) redirect("/select-study");

  const metrics = await getDashboardMetrics(study.id);

  const statusColor: Record<string, string> = {
    setup: "bg-yellow-100 text-yellow-800",
    recruiting: "bg-green-100 text-green-800",
    paused: "bg-orange-100 text-orange-800",
    closed: "bg-gray-100 text-gray-800",
    archived: "bg-gray-200 text-gray-600",
  };

  const enrollmentPercent =
    metrics.enrollment.target && metrics.enrollment.target > 0
      ? Math.round(
          ((metrics.enrollment.value as number) / metrics.enrollment.target) *
            100
        )
      : null;

  return (
    <div className="p-6 space-y-6">
      {/* Study header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{study.name}</h1>
          <p className="text-sm text-muted-foreground">
            {study.protocol_id && <span>{study.protocol_id} &middot; </span>}
            {study.study_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </p>
        </div>
        <Badge className={statusColor[study.status] ?? "bg-gray-100"}>
          {study.status.charAt(0).toUpperCase() + study.status.slice(1)}
        </Badge>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Enrollment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.enrollment.value}
            </div>
            {metrics.enrollment.target ? (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  of {metrics.enrollment.target} target ({enrollmentPercent}%)
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(enrollmentPercent ?? 0, 100)}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">enrolled</p>
            )}
          </CardContent>
        </Card>

        {/* Open Queries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.openQueries.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              requiring attention
            </p>
          </CardContent>
        </Card>

        {/* SAE Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unacknowledged SAEs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(metrics.saeAlerts.value as number) > 0 ? "text-red-600" : ""}`}>
              {metrics.saeAlerts.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics.saeAlerts.value as number) > 0
                ? "action required"
                : "all acknowledged"}
            </p>
          </CardContent>
        </Card>

        {/* Overdue Visits */}
        <Link href={`/org/${orgSlug}/study/${studySlug}/dashboard/overdue`}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue Visits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${(metrics.overdueVisits.value as number) > 0 ? "text-orange-600" : ""}`}>
                {metrics.overdueVisits.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(metrics.overdueVisits.value as number) > 0
                  ? "past window"
                  : "all on schedule"}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Form Completeness */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Form Completeness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.formCompleteness.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              forms completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section: Arm balance + Site enrollment + Form status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Arm Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Arm Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.armBalance.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No randomizations yet
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.armBalance.map((arm) => (
                  <div key={arm.name} className="flex items-center justify-between">
                    <span className="text-sm">{arm.name}</span>
                    <span className="text-sm font-medium">{arm.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Enrollment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Site Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.siteEnrollment.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No participants yet
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.siteEnrollment.map((site) => (
                  <div key={site.name} className="flex items-center justify-between">
                    <span className="text-sm">{site.name}</span>
                    <span className="text-sm font-medium">{site.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Form Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.formStatusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No form responses yet
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.formStatusBreakdown.map((item) => {
                  const colors: Record<string, string> = {
                    draft: "bg-yellow-500",
                    complete: "bg-blue-500",
                    verified: "bg-green-500",
                    locked: "bg-gray-500",
                    signed: "bg-purple-500",
                  };
                  return (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${colors[item.status] ?? "bg-gray-400"}`} />
                        <span className="text-sm capitalize">{item.status}</span>
                      </div>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
