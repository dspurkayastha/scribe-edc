import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
import type { StudyEventRow, StudyArmRow, StudyPeriodRow, EventType } from "@/types/database";
import { AddEventDialog } from "@/components/settings/add-event-dialog";
import { EditEventDialog } from "@/components/settings/edit-event-dialog";
import { ToggleActiveButton } from "@/components/settings/toggle-active-button";
import { GridIcon } from "lucide-react";

const EVENT_TYPE_STYLES: Record<EventType, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  unscheduled: "bg-purple-100 text-purple-800",
  repeating: "bg-teal-100 text-teal-800",
  as_needed: "bg-orange-100 text-orange-800",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  scheduled: "Scheduled",
  unscheduled: "Unscheduled",
  repeating: "Repeating",
  as_needed: "As Needed",
};

export default async function EventsPage({
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

  // Fetch events, arms, and periods in parallel
  const [eventsResult, armsResult, periodsResult] = await Promise.all([
    supabase
      .from("study_events")
      .select("*")
      .eq("study_id", study.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("study_arms")
      .select("*")
      .eq("study_id", study.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("study_periods")
      .select("*")
      .eq("study_id", study.id)
      .order("sort_order", { ascending: true }),
  ]);

  const eventRows = (eventsResult.data ?? []) as StudyEventRow[];
  const arms = (armsResult.data ?? []) as StudyArmRow[];
  const periods = (periodsResult.data ?? []) as StudyPeriodRow[];
  const basePath = `/org/${orgSlug}/study/${studySlug}`;

  // Lookup maps for arm/period labels
  const armMap = new Map(arms.map((a) => [a.id, a.label]));
  const periodMap = new Map(periods.map((p) => [p.id, p.label]));

  // Calculate next sort order for the add dialog
  const nextSortOrder = eventRows.length > 0
    ? Math.max(...eventRows.map((e) => e.sort_order)) + 1
    : 1;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link
            href={`${basePath}/settings`}
            className="hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span>/</span>
          <span>Events</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Study Events</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visit schedule and event definitions
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {eventRows.length} event{eventRows.length !== 1 ? "s" : ""} defined
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/settings/events/matrix`}>
                  <GridIcon className="h-4 w-4" />
                  Event-Form Matrix
                </Link>
              </Button>
              <AddEventDialog
                studyId={study.id}
                nextSortOrder={nextSortOrder}
                arms={arms}
                periods={periods}
                existingEvents={eventRows}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No events have been defined yet.</p>
              <p className="text-xs mt-1">
                Events define the visit schedule for study participants.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    {arms.length > 0 && <TableHead>Arm</TableHead>}
                    {periods.length > 0 && <TableHead>Period</TableHead>}
                    <TableHead className="text-center">Day Offset</TableHead>
                    <TableHead className="text-center">Window</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventRows.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {event.sort_order}
                      </TableCell>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.label}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={EVENT_TYPE_STYLES[event.event_type]}
                        >
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </Badge>
                      </TableCell>
                      {arms.length > 0 && (
                        <TableCell className="text-sm text-muted-foreground">
                          {event.arm_id ? armMap.get(event.arm_id) ?? "\u2014" : "All"}
                        </TableCell>
                      )}
                      {periods.length > 0 && (
                        <TableCell className="text-sm text-muted-foreground">
                          {event.period_id ? periodMap.get(event.period_id) ?? "\u2014" : "\u2014"}
                        </TableCell>
                      )}
                      <TableCell className="text-center font-mono text-sm">
                        {event.day_offset != null
                          ? `Day ${event.day_offset}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {event.window_before === 0 && event.window_after === 0
                          ? "\u2014"
                          : `\u2212${event.window_before} / +${event.window_after}`}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            event.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {event.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditEventDialog
                            event={event}
                            studyId={study.id}
                            arms={arms}
                            periods={periods}
                            otherEvents={eventRows.filter((e) => e.id !== event.id)}
                          />
                          <ToggleActiveButton
                            entityType="event"
                            entityId={event.id}
                            studyId={study.id}
                            isActive={event.is_active}
                            entityName={event.label}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
