import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardIcon } from "./DashboardIcon";
import { Download01Icon, FilterIcon, Search01Icon } from "@hugeicons/core-free-icons";
import type { FilterState, StoredEvent, WebhookPayload } from "@/types";

interface FiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  events: StoredEvent[];
}

export function Filters({ filters, onFiltersChange, events }: FiltersProps) {
  const macOSVersions = React.useMemo(() => {
    const versions = new Set(events.map((e) => e.payload.macOSVersion));
    return Array.from(versions).sort().reverse();
  }, [events]);

  const models = React.useMemo(() => {
    const modelSet = new Set(events.map((e) => e.payload.modelName));
    return Array.from(modelSet).sort();
  }, [events]);

  const handleExport = (format: "csv" | "json") => {
    const data = events.map((e) => e.payload);
    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadFile("events.json", blob);
    } else {
      const csv = toCsv(data as WebhookPayload[]);
      const blob = new Blob([csv], { type: "text/csv" });
      downloadFile("events.csv", blob);
    }
  };

  const downloadFile = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Sanitize a string for safe CSV output.
   * Prefixes cells that start with formula-triggering characters with a
   * single quote so spreadsheet apps (Excel, Sheets) treat them as text
   * rather than executable formulas.
   */
  const sanitizeCsvValue = (str: string): string => {
    const FORMULA_CHARS = ["=", "+", "-", "@", "\t", "\r", "\n"];
    if (FORMULA_CHARS.some((c) => str.startsWith(c))) {
      str = "'" + str;
    }
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const toCsv = (rows: WebhookPayload[]) => {
    const headers = [
      "event", "timestamp", "started", "finished", "duration",
      "serialNumber", "modelName", "computerName",
    ];
    const lines = [headers.join(",")];
    rows.forEach((payload) => {
      const values = headers.map((h) => {
        const v = (payload as unknown as Record<string, unknown>)[h];
        if (v === undefined || v === null) return "";
        return sanitizeCsvValue(String(v));
      });
      lines.push(values.join(","));
    });
    return lines.join("\n");
  };

  return (
    <TooltipProvider>
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,1.2fr)_auto] lg:items-start">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2 xl:col-span-1">
            <DashboardIcon
              icon={Search01Icon}
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search serial, model, user, or OS"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="h-11 pl-9 text-sm md:text-base"
            />
          </div>

          <Select
            value={filters.eventType}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, eventType: value as FilterState["eventType"] })
            }
          >
            <SelectTrigger className="h-11 w-full text-sm md:text-base">
              <SelectValue placeholder="All events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="failed">Failed actions</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.macOSVersion || "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, macOSVersion: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="h-11 w-full text-sm md:text-base">
              <SelectValue placeholder="All macOS versions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All macOS versions</SelectItem>
              {macOSVersions.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.model || "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, model: value === "all" ? "" : value })
            }
          >
            <SelectTrigger className="h-11 w-full text-sm md:text-base">
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All models</SelectItem>
              {models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="dashboard-badge">
              <DashboardIcon icon={FilterIcon} size={14} className="mr-1" />
              {events.length} loaded
            </Badge>
          </div>

          <DropdownMenu>
            <Tooltip>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="h-11 min-w-[128px] text-sm md:text-base">
                    <DashboardIcon icon={Download01Icon} size={16} className="mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <TooltipContent>Download visible data as CSV or JSON</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
