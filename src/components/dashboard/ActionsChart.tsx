import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StoredEvent, WebhookPayload } from "@/types";

interface ActionsChartProps {
  events: StoredEvent[];
  embedded?: boolean;
}

const FINISHED_COLOR = "var(--chart-2)";
const FAILED_COLOR = "var(--chart-5)";

export function ActionsChart({ events, embedded = false }: ActionsChartProps) {
  const actionData = events
    .filter((e) => e.payload.event === "com.jamf.setupmanager.finished")
    .flatMap((e) => (e.payload as WebhookPayload).enrollmentActions || [])
    .reduce(
      (acc, action) => {
        if (!acc[action.label]) {
          acc[action.label] = { label: action.label, finished: 0, failed: 0 };
        }
        if (action.status === "finished") acc[action.label].finished++;
        else acc[action.label].failed++;
        return acc;
      },
      {} as Record<string, { label: string; finished: number; failed: number }>
    );

  const chartData = Object.values(actionData)
    .sort((a, b) => b.finished + b.failed - (a.finished + a.failed))
    .slice(0, 10);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
        No enrollment action data yet
      </div>
    );
  }

  const chart = (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} width={110} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />
        <Bar dataKey="finished" name="Finished" fill={FINISHED_COLOR} stackId="a" />
        <Bar dataKey="failed" name="Failed" fill={FAILED_COLOR} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );

  if (embedded) {
    return chart;
  }

  return (
    <div>{chart}</div>
  );
}
