import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuditLog } from "@/server/actions/audit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

const TABLE_OPTIONS = [
  { value: "participants", label: "Participants" },
  { value: "form_responses", label: "Form Responses" },
  { value: "study_members", label: "Study Members" },
  { value: "adverse_events", label: "Adverse Events" },
  { value: "data_queries", label: "Data Queries" },
  { value: "randomization_allocations", label: "Randomizations" },
  { value: "form_definitions", label: "Form Definitions" },
  { value: "study_events", label: "Study Events" },
  { value: "signatures", label: "Signatures" },
] as const;

const ACTION_OPTIONS = [
  { value: "INSERT", label: "Insert" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
] as const;

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    INSERT: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={styles[action] ?? "bg-gray-100 text-gray-800"}>
      {action}
    </Badge>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function AuditLogPage({
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

  const currentPage = Number(sp.page) || 1;
  const tableName = typeof sp.tableName === "string" && sp.tableName !== "__all__" ? sp.tableName : undefined;
  const action = typeof sp.action === "string" && sp.action !== "__all__" ? sp.action : undefined;
  const dateFrom = typeof sp.dateFrom === "string" ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === "string" ? sp.dateTo : undefined;

  const result = await getAuditLog(study.id, {
    page: currentPage,
    pageSize: 25,
    tableName,
    action,
    dateFrom,
    dateTo,
  });

  // Build URL helper for filter links
  function buildUrl(overrides: Record<string, string | undefined>): string {
    const base = `/org/${orgSlug}/study/${studySlug}/audit-log`;
    const merged: Record<string, string> = {};
    if (tableName) merged.tableName = tableName;
    if (action) merged.action = action;
    if (dateFrom) merged.dateFrom = dateFrom;
    if (dateTo) merged.dateTo = dateTo;
    // Apply overrides (undefined removes the key)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    }
    // Always reset to page 1 when filters change (unless page is explicitly set)
    if (!("page" in overrides)) {
      delete merged.page;
    }
    const qs = new URLSearchParams(merged).toString();
    return qs ? `${base}?${qs}` : base;
  }

  function pageUrl(page: number): string {
    return buildUrl({ page: String(page) });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all changes in this study
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-4">
            {/* Table Name Filter */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tableName" className="text-xs">
                Table
              </Label>
              <Select name="tableName" defaultValue={tableName ?? "__all__"}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All tables</SelectItem>
                  {TABLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action" className="text-xs">
                Action
              </Label>
              <Select name="action" defaultValue={action ?? "__all__"}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All actions</SelectItem>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateFrom" className="text-xs">
                From
              </Label>
              <Input
                type="date"
                name="dateFrom"
                defaultValue={dateFrom ?? ""}
                className="w-[160px]"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateTo" className="text-xs">
                To
              </Label>
              <Input
                type="date"
                name="dateTo"
                defaultValue={dateTo ?? ""}
                className="w-[160px]"
              />
            </div>

            <Button type="submit" size="sm">
              Apply Filters
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${orgSlug}/study/${studySlug}/audit-log`}>
                Clear
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {result.total} record{result.total !== 1 ? "s" : ""} found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No audit log entries found matching the current filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Changed Fields</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">
                      {formatTimestamp(row.changed_at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.table_name}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={row.action} />
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs max-w-[120px] truncate"
                      title={row.record_id}
                    >
                      {row.record_id.length > 12
                        ? `${row.record_id.slice(0, 8)}...`
                        : row.record_id}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      {row.changed_fields && row.changed_fields.length > 0
                        ? row.changed_fields.join(", ")
                        : <span className="text-muted-foreground">--</span>}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">
                      {row.reason ?? (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs max-w-[120px] truncate"
                      title={row.changed_by ?? undefined}
                    >
                      {row.changed_by
                        ? row.changed_by.length > 12
                          ? `${row.changed_by.slice(0, 8)}...`
                          : row.changed_by
                        : <span className="text-muted-foreground">System</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex items-center gap-2">
                {result.page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageUrl(result.page - 1)}>Previous</Link>
                  </Button>
                )}
                {result.page < result.totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={pageUrl(result.page + 1)}>Next</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
