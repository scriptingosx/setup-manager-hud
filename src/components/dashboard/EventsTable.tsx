import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardIcon } from "./DashboardIcon";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { StoredEvent, WebhookPayload } from "@/types";

type ThroughputQuality = "good" | "ok" | "slow";

function getThroughputQuality(mbps: number, type: "upload" | "download"): ThroughputQuality {
  if (type === "download") {
    if (mbps >= 50) return "good";
    if (mbps >= 10) return "ok";
    return "slow";
  }
  if (mbps >= 20) return "good";
  if (mbps >= 5) return "ok";
  return "slow";
}

function getQualityColor(quality: ThroughputQuality): string {
  switch (quality) {
    case "good": return "text-green-500 font-semibold";
    case "ok": return "text-yellow-500 font-semibold";
    case "slow": return "text-destructive font-semibold";
  }
}

function getQualityLabel(quality: ThroughputQuality): string {
  switch (quality) {
    case "good": return "Good";
    case "ok": return "OK";
    case "slow": return "Slow";
  }
}

function getOverallQuality(download?: number, upload?: number): ThroughputQuality | null {
  if (download === undefined && upload === undefined) return null;
  const qualities: ThroughputQuality[] = [];
  if (download !== undefined) qualities.push(getThroughputQuality(download / 1e6, "download"));
  if (upload !== undefined) qualities.push(getThroughputQuality(upload / 1e6, "upload"));
  if (qualities.includes("slow")) return "slow";
  if (qualities.includes("ok")) return "ok";
  return "good";
}

function NetworkIndicator({ download, upload }: { download?: number; upload?: number }) {
  const quality = getOverallQuality(download, upload);
  if (quality === null) return <span className="text-muted-foreground">—</span>;

  const bg =
    quality === "good" ? "bg-green-500" :
    quality === "ok" ? "bg-yellow-500" :
    "bg-destructive";

  return (
    <div className="flex justify-center">
      <div className={`w-3 h-3 rounded-full ${bg}`} />
    </div>
  );
}

interface EventsTableProps {
  events: StoredEvent[];
  maxVisible?: number;
}

export function EventsTable({ events, maxVisible = 50 }: EventsTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const visibleEvents = events.slice(0, maxVisible);

  const toggleRow = (eventId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const formatTime = (timestamp: string | number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="rounded-md border dashboard-table text-base">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Finished</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Serial</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleEvents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No events yet. Waiting for webhook data...
              </TableCell>
            </TableRow>
          ) : (
            visibleEvents.map((event) => {
              const payload = event.payload as WebhookPayload;
              const isExpanded = expandedRows.has(event.eventId);
              const isStarted = payload.event === "com.jamf.setupmanager.started";
              const actions = payload.enrollmentActions || [];
              const failedCount = actions.filter((a) => a.status === "failed").length;

              return (
                <React.Fragment key={event.eventId}>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleRow(event.eventId)}
                      >
                        {isExpanded ? (
                          <DashboardIcon icon={ArrowDown01Icon} size={16} />
                        ) : (
                          <DashboardIcon icon={ArrowRight01Icon} size={16} />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isStarted ? "default" : "secondary"}
                        className="dashboard-badge text-base"
                      >
                        {payload.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-base">
                      {formatTime(payload.started)}
                    </TableCell>
                    <TableCell className="font-mono text-base">
                      {payload.finished ? formatTime(payload.finished) : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-base">
                      {formatDuration(payload.duration)}
                    </TableCell>
                    <TableCell>
                      <NetworkIndicator
                        download={payload.downloadThroughput}
                        upload={payload.uploadThroughput}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-base">
                      {payload.serialNumber}
                    </TableCell>
                    <TableCell>{payload.modelName}</TableCell>
                    <TableCell>
                      {actions.length > 0 ? (
                        <span className="text-base">
                          {actions.length - failedCount}/{actions.length}
                          {failedCount > 0 && (
                            <span className="text-destructive ml-1">
                              ({failedCount} failed)
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={9} className="p-6">
                        <EventDetail payload={payload} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function NetworkInfo({ upload, download }: { upload?: number; download?: number }) {
  if (upload === undefined && download === undefined) return null;

  const uploadMbps = upload !== undefined ? upload / 1e6 : undefined;
  const downloadMbps = download !== undefined ? download / 1e6 : undefined;

  return (
    <div className="mb-4 pb-4 border-b border-border">
      <p className="mb-2 text-base font-medium text-muted-foreground">Network</p>
      <div className="flex items-center gap-6 text-base">
        {downloadMbps !== undefined && (() => {
          const quality = getThroughputQuality(downloadMbps, "download");
          return (
            <div className="flex items-center gap-1.5">
              <DashboardIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground" />
              <span className="font-mono">{downloadMbps.toFixed(1)} Mbps</span>
              <span className={getQualityColor(quality)}>{getQualityLabel(quality)}</span>
            </div>
          );
        })()}
        {uploadMbps !== undefined && (() => {
          const quality = getThroughputQuality(uploadMbps, "upload");
          return (
            <div className="flex items-center gap-1.5">
              <DashboardIcon icon={ArrowUp01Icon} size={14} className="text-muted-foreground" />
              <span className="font-mono">{uploadMbps.toFixed(1)} Mbps</span>
              <span className={getQualityColor(quality)}>{getQualityLabel(quality)}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function EventDetail({ payload }: { payload: WebhookPayload }) {
  return (
    <div className="text-base">
      <NetworkInfo upload={payload.uploadThroughput} download={payload.downloadThroughput} />
      <div className="grid grid-cols-2 gap-5 text-base md:grid-cols-4">
        <div>
          <p className="text-lg text-muted-foreground">macOS Version</p>
          <p className="text-[1.65rem] font-semibold leading-tight">{payload.macOSVersion}</p>
        </div>
        <div>
          <p className="text-lg text-muted-foreground">macOS Build</p>
          <p className="text-[1.65rem] font-semibold leading-tight">{payload.macOSBuild}</p>
        </div>
        <div>
          <p className="text-lg text-muted-foreground">Model ID</p>
          <p className="text-[1.65rem] font-semibold leading-tight">{payload.modelIdentifier}</p>
        </div>
        <div>
          <p className="text-lg text-muted-foreground">Setup Manager</p>
          <p className="text-[1.65rem] font-semibold leading-tight">v{payload.setupManagerVersion}</p>
        </div>

        {payload.computerName && (
          <div>
            <p className="text-lg text-muted-foreground">Computer Name</p>
            <p className="text-[1.65rem] font-semibold leading-tight">{payload.computerName}</p>
          </div>
        )}

        {payload.userEntry && (
          <>
            {payload.userEntry.userID && (
              <div>
                <p className="text-lg text-muted-foreground">User ID</p>
                <p className="text-[1.65rem] font-semibold leading-tight">{payload.userEntry.userID}</p>
              </div>
            )}
            {payload.userEntry.department && (
              <div>
                <p className="text-lg text-muted-foreground">Department</p>
                <p className="text-[1.65rem] font-semibold leading-tight">{payload.userEntry.department}</p>
              </div>
            )}
          </>
        )}

        {payload.enrollmentActions && payload.enrollmentActions.length > 0 && (
          <div className="col-span-full">
            <p className="mb-3 text-lg text-muted-foreground">Enrollment Actions</p>
            <div className="flex flex-wrap gap-2">
              {payload.enrollmentActions.map((action, idx) => (
                <Badge
                  key={idx}
                  variant={action.status === "finished" ? "default" : "destructive"}
                  className="dashboard-badge px-4 py-1.5 text-base"
                >
                  {action.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
