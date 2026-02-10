import { cn } from "@/lib/utils";
import { DashboardIcon } from "./DashboardIcon";
import { Wifi01Icon, WifiDisconnected01Icon } from "@hugeicons/core-free-icons";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5">
      <DashboardIcon
        icon={connected ? Wifi01Icon : WifiDisconnected01Icon}
        size={15}
        className={cn(
          connected ? "text-green-600 dark:text-green-400" : "text-destructive"
        )}
      />
      <span className="text-sm font-medium text-muted-foreground">
        {connected ? "Live" : "Disconnected"}
      </span>
    </div>
  );
}
