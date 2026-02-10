import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardIcon } from "./DashboardIcon";
import {
  Activity01Icon,
  Tick01Icon,
  Clock01Icon,
  AlertDiamondIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

interface KpiCardsProps {
  started: number;
  finished: number;
  avgDuration: number;
  failedActions: number;
}

export function KpiCards({ started, finished, avgDuration, failedActions }: KpiCardsProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const cards: {
    title: string;
    value: string | number;
    icon: IconSvgElement;
    description: string;
    color: string;
  }[] = [
    {
      title: "Total Started",
      value: started,
      icon: Activity01Icon,
      description: "Devices began setup",
      color: "text-primary",
    },
    {
      title: "Total Finished",
      value: finished,
      icon: Tick01Icon,
      description: "Devices completed setup",
      color: "text-green-500",
    },
    {
      title: "Avg Duration",
      value: formatDuration(avgDuration),
      icon: Clock01Icon,
      description: "Average setup time",
      color: "text-primary",
    },
    {
      title: "Failed Actions",
      value: failedActions,
      icon: AlertDiamondIcon,
      description: "Enrollment actions failed",
      color: failedActions > 0 ? "text-destructive" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="stat-label text-sm">{card.title}</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/70">
              <DashboardIcon icon={card.icon} size={18} className={card.color} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-value">{card.value}</div>
            <CardDescription className="mt-1 text-sm">{card.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
