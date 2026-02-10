import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StoredEvent } from "@/types";

interface EventsChartProps {
  events: StoredEvent[];
  embedded?: boolean;
}

const STARTED_COLOR = "var(--chart-3)";
const FINISHED_COLOR = "var(--chart-2)";

export function EventsChart({ events, embedded = false }: EventsChartProps) {
  const chartData = createTimeBuckets(events);

  if (chartData.length === 0 || events.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
        No event data yet
      </div>
    );
  }

  const chart = (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="startedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={STARTED_COLOR} stopOpacity={0.4} />
            <stop offset="95%" stopColor={STARTED_COLOR} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="finishedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={FINISHED_COLOR} stopOpacity={0.4} />
            <stop offset="95%" stopColor={FINISHED_COLOR} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="finished"
          name="Finished"
          stroke={FINISHED_COLOR}
          fill="url(#finishedGradient)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="started"
          name="Started"
          stroke={STARTED_COLOR}
          fill="url(#startedGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (embedded) {
    return chart;
  }

  return (
    <div>{chart}</div>
  );
}

function createTimeBuckets(events: StoredEvent[]) {
  if (events.length === 0) return [];

  const eventTimes = events
    .map((e) => ({ time: new Date(e.payload.started).getTime(), event: e }))
    .filter((e) => !isNaN(e.time));

  if (eventTimes.length === 0) return [];

  const timestamps = eventTimes.map((e) => e.time);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = maxTime - minTime;

  const oneHour = 3600000;
  const oneDay = 86400000;

  let bucketSize: number;
  let formatOptions: Intl.DateTimeFormatOptions;

  if (timeRange <= 2 * oneHour) {
    bucketSize = 600000; // 10 min
    formatOptions = { hour: "2-digit", minute: "2-digit" };
  } else if (timeRange <= oneDay) {
    bucketSize = oneHour;
    formatOptions = { hour: "2-digit", minute: "2-digit" };
  } else if (timeRange <= 7 * oneDay) {
    bucketSize = 4 * oneHour;
    formatOptions = { weekday: "short", hour: "2-digit" };
  } else {
    bucketSize = oneDay;
    formatOptions = { month: "short", day: "numeric" };
  }

  const buckets: Map<number, { started: number; finished: number }> = new Map();
  const startBucket = Math.floor(minTime / bucketSize) * bucketSize;
  const endBucket = Math.floor(maxTime / bucketSize) * bucketSize;

  for (let bucket = startBucket; bucket <= endBucket; bucket += bucketSize) {
    buckets.set(bucket, { started: 0, finished: 0 });
  }

  for (const { time, event } of eventTimes) {
    const bucket = Math.floor(time / bucketSize) * bucketSize;
    const data = buckets.get(bucket);
    if (data) {
      if (event.payload.event === "com.jamf.setupmanager.started") {
        data.started++;
      } else {
        data.finished++;
      }
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, data]) => ({
      label: new Date(timestamp).toLocaleString("en-US", formatOptions),
      ...data,
    }))
    .slice(-20);
}
