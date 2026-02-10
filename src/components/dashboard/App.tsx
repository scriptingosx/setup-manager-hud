import * as React from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { KpiCards } from "./KpiCards";
import { EventsTable } from "./EventsTable";
import { EventsChart } from "./EventsChart";
import { ActionsChart } from "./ActionsChart";
import { Filters } from "./Filters";
import { ConnectionStatus } from "./ConnectionStatus";
import { ThemeToggle } from "./ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FilterState, WebhookPayload } from "@/types";

export function App() {
  const { connected, events, stats } = useWebSocket();
  const [filters, setFilters] = React.useState<FilterState>({
    eventType: "all",
    macOSVersion: "",
    model: "",
    timeRange: "all",
    search: "",
  });

  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => {
      const payload = event.payload as WebhookPayload;

      if (filters.eventType === "started" && payload.event !== "com.jamf.setupmanager.started") {
        return false;
      }
      if (filters.eventType === "finished" && payload.event !== "com.jamf.setupmanager.finished") {
        return false;
      }
      if (filters.eventType === "failed") {
        const actions = payload.enrollmentActions || [];
        if (!actions.some((a) => a.status === "failed")) {
          return false;
        }
      }

      if (filters.macOSVersion && !payload.macOSVersion.includes(filters.macOSVersion)) {
        return false;
      }

      if (filters.model && !payload.modelName.toLowerCase().includes(filters.model.toLowerCase())) {
        return false;
      }

      if (filters.timeRange !== "all") {
        const now = Date.now();
        const ranges = { hour: 3600000, day: 86400000, week: 604800000 };
        if (now - event.timestamp > ranges[filters.timeRange]) {
          return false;
        }
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          payload.serialNumber,
          payload.modelName,
          payload.computerName,
          payload.macOSVersion,
          payload.userEntry?.userID,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [events, filters]);

  if (!connected && events.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header connected={false} />
        <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header connected={connected} />
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        <div className="space-y-8">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
                Setup Manager Activity Overview
              </CardTitle>
              <CardDescription className="text-base md:text-lg">
                Track active setup workflows, completion trends, and failure points in real time.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 pt-0">
              <Badge variant="secondary" className="dashboard-badge text-sm">
                {stats.total} total events
              </Badge>
              <Badge variant="secondary" className="dashboard-badge text-sm">
                {stats.successRate}% action success
              </Badge>
              <Badge variant={stats.failedActions > 0 ? "destructive" : "secondary"} className="dashboard-badge text-sm">
                {stats.failedActions} failed actions
              </Badge>
            </CardContent>
          </Card>

          <KpiCards
            started={stats.started}
            finished={stats.finished}
            avgDuration={stats.avgDuration}
            failedActions={stats.failedActions}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Event Timeline</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Started and finished activity grouped over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <EventsChart events={filteredEvents} embedded />
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Action Quality</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  Most frequent enrollment actions and failure counts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ActionsChart events={filteredEvents} embedded />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Filter & Export</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Narrow down events to find specific devices, versions, and outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Filters filters={filters} onFiltersChange={setFilters} events={events} />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Recent Events</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Expanded rows show network and enrollment details per device.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <EventsTable events={filteredEvents} />
            </CardContent>
          </Card>
        </div>
      </main>
      <PoweredByJamf />
    </div>
  );
}

function Header({ connected }: { connected: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3 md:gap-4">
          <h1 className="dashboard-header">Setup Manager HUD</h1>
          <ConnectionStatus connected={connected} />
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
      <Skeleton className="h-[60px]" />
      <Skeleton className="h-[400px]" />
    </div>
  );
}

function PoweredByJamf() {
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-full border border-border/80 bg-card/90 px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur">
      <span className="inline-flex items-center gap-2">
        Powered by Jamf
        <img
          src="/jamf-icon-white.svg"
          alt="Jamf"
          className="hidden h-[1.05em] w-auto dark:block"
        />
        <img
          src="/jamf-icon-dark.svg"
          alt="Jamf"
          className="block h-[1.05em] w-auto dark:hidden"
        />
      </span>
    </div>
  );
}
