
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, Wallet, ListTodo, StickyNote, Goal } from "lucide-react";
import SidebarItem from "./SidebarItem";
import "../sidebar.css";

type Item = { to: string; label: string; icon?: any };

const NAV: Item[] = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/finance", label: "Финансы", icon: Wallet },
  { to: "/tasks", label: "Задачи", icon: ListTodo },
  { to: "/notes", label: "Заметки", icon: StickyNote },
  { to: "/goals", label: "Цели", icon: Goal },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("app.sidebar.collapsed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("app.sidebar.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  return (
    <aside className={collapsed ? "frou-sidebar is-collapsed" : "frou-sidebar"} role="navigation" aria-label="Основное меню">
      {/* Header */}
      <div className="fs-header">
        <Link to="/" className="fs-logo" aria-label="На главную">
          <div className="fs-badge">F</div>
          {!collapsed && <div className="fs-brand">Finance Suite</div>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="fs-nav">
        {NAV.map((it) => (
          <SidebarItem key={it.to} to={it.to} label={it.label} icon={it.icon} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer toggle */}
      <div className="fs-bottom">
        <button
          className="fs-toggle"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          <ChevronLeft className={`size-5 text-blue-600 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>
    </aside>
  );
}
