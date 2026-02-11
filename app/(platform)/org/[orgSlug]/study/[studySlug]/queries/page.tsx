import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { requireStudyAccess } from "@/lib/auth/session";
import { canManageQueries } from "@/lib/auth/permissions";
import { CreateQueryDialog } from "@/components/queries/create-query-dialog";
import { QueriesTable } from "@/components/queries/queries-table";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function QueriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; studySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug, studySlug } = await params;
  const sp = await searchParams;

  const supabase = await createClient();

  const { data: study } = await supabase
    .from("studies")
    .select("id")
    .eq("slug", studySlug)
    .single();

  if (!study) redirect("/select-study");

  // Get user role for permission checks
  const { role } = await requireStudyAccess(study.id);
  const userCanManage = canManageQueries(role);

  const statusFilter =
    typeof sp.status === "string" && sp.status !== "__all__" ? sp.status : undefined;

  let query = supabase
    .from("data_queries")
    .select("*, participants(study_number)")
    .eq("study_id", study.id)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: queries } = await query;
  const rows = queries ?? [];

  // Compute summary counts
  const counts = {
    open: 0,
    answered: 0,
    closed: 0,
    cancelled: 0,
    total: rows.length,
  };
  // Count across all queries (not just filtered)
  const { data: allQueries } = await supabase
    .from("data_queries")
    .select("status")
    .eq("study_id", study.id);

  for (const q of allQueries ?? []) {
    const s = (q as any).status as string;
    if (s in counts) {
      counts[s as keyof typeof counts]++;
    }
  }
  counts.total = (allQueries ?? []).length;

  // Fetch participants for the create query dialog
  const { data: participants } = await supabase
    .from("participants")
    .select("id, study_number")
    .eq("study_id", study.id)
    .is("deleted_at", null)
    .order("study_number");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Queries</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage data queries raised during monitoring and validation
          </p>
        </div>
        {userCanManage && (
          <CreateQueryDialog
            studyId={study.id}
            participants={(participants ?? []).map((p: any) => ({
              id: p.id,
              study_number: p.study_number,
            }))}
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold text-red-600">{counts.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Answered</p>
            <p className="text-2xl font-bold text-yellow-600">{counts.answered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Closed</p>
            <p className="text-2xl font-bold text-green-600">{counts.closed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status" className="text-xs">
                Status
              </Label>
              <Select name="status" defaultValue={statusFilter ?? "__all__"}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm">
              Apply
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${orgSlug}/study/${studySlug}/queries`}>
                Clear
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Queries table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {rows.length} quer{rows.length !== 1 ? "ies" : "y"}{" "}
            {statusFilter ? `(${statusFilter})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No data queries found{statusFilter ? ` with status "${statusFilter}"` : ""}.
            </p>
          ) : (
            <QueriesTable
              rows={rows}
              studyId={study.id}
              canManage={userCanManage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
