import { useState, useEffect } from "react";
import { DashboardIcon } from "./DashboardIcon";
import { Sun01Icon, Moon01Icon, LaptopIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      localStorage.removeItem("theme");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  const cycleTheme = () => {
    const modes: Theme[] = ["light", "dark", "system"];
    const next = modes[(modes.indexOf(theme) + 1) % modes.length];
    setTheme(next);
  };

  const icon =
    theme === "light" ? Sun01Icon :
    theme === "dark" ? Moon01Icon :
    LaptopIcon;

  const label =
    theme === "light" ? "Light mode" :
    theme === "dark" ? "Dark mode" :
    "System mode";

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} title={label}>
      <DashboardIcon icon={icon} size={20} />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
