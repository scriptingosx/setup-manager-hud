import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

interface DashboardIconProps {
  icon: IconSvgElement;
  size?: number;
  className?: string;
}

export function DashboardIcon({ icon, size = 18, className }: DashboardIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.5}
      className={className}
    />
  );
}
