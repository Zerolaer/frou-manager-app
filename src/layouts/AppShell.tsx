
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { cn } from "../lib/cn";

export default function AppShell() {
  return (
    <div className="app-shell h-screen w-screen overflow-hidden">
      <div className="flex h-full w-full">
        <Sidebar />
        <main className={cn("min-w-0 flex-1 overflow-hidden","bg-white")}>
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
