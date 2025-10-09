
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, Wallet, ListTodo, StickyNote, Goal } from "lucide-react";
import { useTranslation } from 'react-i18next';
import SidebarItem from "./SidebarItem";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { CACHE_KEYS, APP_NAME } from "@/lib/constants";
import "../sidebar.css";

type Item = { to: string; label: string; icon?: any };

export default function Sidebar() {
  const [collapsed, setCollapsed] = useLocalStorage(CACHE_KEYS.SIDEBAR_COLLAPSED, false);
  const { t } = useTranslation();

  const NAV: Item[] = [
    { to: "/", label: t('nav.home'), icon: Home },
    { to: "/finance", label: t('nav.finance'), icon: Wallet },
    { to: "/tasks", label: t('nav.tasks'), icon: ListTodo },
    { to: "/notes", label: t('nav.notes'), icon: StickyNote },
    { to: "/goals", label: t('nav.goals'), icon: Goal },
  ];

  return (
    <aside 
      id="main-navigation"
      className={collapsed ? "frou-sidebar is-collapsed" : "frou-sidebar"} 
      role="navigation" 
      aria-label={t('aria.mainNavigation')}
    >
      {/* Header */}
      <div className="fs-header">
        <Link to="/" className="fs-logo" aria-label={t('aria.goToHome')}>
          <div className="fs-badge">F</div>
          {!collapsed && <div className="fs-brand">{APP_NAME}</div>}
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
          aria-label={collapsed ? t('aria.expandMenu') : t('aria.collapseMenu')}
          title={collapsed ? t('aria.expand') : t('aria.collapse')}
        >
          <ChevronLeft className={`size-5 text-blue-600 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>
    </aside>
  );
}
