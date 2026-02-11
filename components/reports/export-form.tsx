"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportWideCsv, exportLongCsv, exportJson } from "@/server/actions/exports";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FormDefinition {
  id: string;
  slug: string;
  title: string;
  version: number;
}

interface ExportFormProps {
  studyId: string;
  forms: FormDefinition[];
}

type ExportFormat = "csv_wide" | "csv_long" | "json";

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "csv_wide", label: "CSV (Wide)", description: "One row per participant, one column per field" },
  { value: "csv_long", label: "CSV (Long)", description: "One row per field value, normalized format" },
  { value: "json", label: "JSON", description: "Full JSON export with all metadata" },
];

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportForm({ studyId, forms }: ExportFormProps) {
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [format, setFormat] = useState<ExportFormat>("csv_wide");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!selectedForm) {
      toast.error("Please select a form to export.");
      return;
    }

    setIsExporting(true);

    try {
      const formDef = forms.find((f) => f.slug === selectedForm);
      const formTitle = formDef?.title ?? selectedForm;
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === "csv_wide") {
        const result = await exportWideCsv(studyId, selectedForm);
        if (!result.success || !result.csv) {
          toast.error(result.error ?? "Export failed.");
          return;
        }
        triggerDownload(
          result.csv,
          `${formTitle}_wide_${timestamp}.csv`,
          "text/csv;charset=utf-8"
        );
        toast.success("CSV (Wide) export downloaded successfully.");
      } else if (format === "csv_long") {
        const result = await exportLongCsv(studyId, selectedForm);
        if (!result.success || !result.csv) {
          toast.error(result.error ?? "Export failed.");
          return;
        }
        triggerDownload(
          result.csv,
          `${formTitle}_long_${timestamp}.csv`,
          "text/csv;charset=utf-8"
        );
        toast.success("CSV (Long) export downloaded successfully.");
      } else if (format === "json") {
        const result = await exportJson(studyId, selectedForm);
        if (!result.success || !result.json) {
          toast.error(result.error ?? "Export failed.");
          return;
        }
        triggerDownload(
          result.json,
          `${formTitle}_${timestamp}.json`,
          "application/json"
        );
        toast.success("JSON export downloaded successfully.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Export Data</CardTitle>
        <CardDescription>
          Select a form and export format to download study data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 max-w-md">
          {/* Form selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="form-select" className="text-sm">
              Form
            </Label>
            {forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active forms available for export.
              </p>
            ) : (
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger id="form-select" className="w-full">
                  <SelectValue placeholder="Select a form..." />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.slug} value={form.slug}>
                      {form.title} (v{form.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Format selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="format-select" className="text-sm">
              Export Format
            </Label>
            <Select
              value={format}
              onValueChange={(val) => setFormat(val as ExportFormat)}
            >
              <SelectTrigger id="format-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {FORMAT_OPTIONS.find((o) => o.value === format)?.description}
            </p>
          </div>

          {/* Export button */}
          <Button
            onClick={handleExport}
            disabled={isExporting || forms.length === 0 || !selectedForm}
            className="w-fit"
          >
            {isExporting ? (
              <>
                <Loader2 className="animate-spin" />
                Exporting...
              </>
            ) : (
              "Export"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
