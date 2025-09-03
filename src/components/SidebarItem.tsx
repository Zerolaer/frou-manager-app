import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

type Props = {
  to: string;
  label: string;
  icon?: LucideIcon;
  collapsed?: boolean;
};

export default function SidebarItem({ to, label, icon: Icon, collapsed }: Props) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "fs-link",
          isActive ? "active" : null
        )
      }
      title={label}
    >
      {Icon ? (<Icon className="fs-icon" aria-hidden="true" />) : (
        <span className="size-1.5 rounded-full" />
      )}
      {!collapsed && <span className="fs-label">{label}</span>}
    </NavLink>
  );
}
