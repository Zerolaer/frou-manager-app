
import React, { useMemo, useState } from "react";
import { BentoCard } from "@/components/ui/BentoCard";
import { NeoButton } from "@/components/ui/NeoButton";
import { GlassModal } from "@/components/ui/GlassModal";

type Task = {
  id: string;
  title: string;
  desc?: string;
  priority?: "low" | "med" | "high";
  due?: string | null;
  status: "today" | "upcoming" | "backlog";
  project?: string;
  tags?: string[];
};

const seed: Task[] = [
  { id: "1", title: "Update onboarding flow", status: "today", priority: "high", tags: ["UX","Release"], due: "2025-09-06" },
  { id: "2", title: "Fix modal z-index stacking", status: "today", priority: "med", tags: ["UI"], due: "2025-09-05" },
  { id: "3", title: "Write unit tests for utils", status: "upcoming", priority: "low", tags: ["TechDebt"] },
  { id: "4", title: "Design empty states", status: "backlog", priority: "med", tags: ["Design"] },
];

function PriorityDot({p}:{p?: Task["priority"]}){
  const color = p === "high" ? "bg-red-400"
              : p === "med" ? "bg-yellow-400"
              : "bg-zinc-400";
  return <span className={"inline-block w-2 h-2 rounded-full " + color} />;
}

function Tag({t}:{t:string}){
  return <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-zinc-300">{t}</span>;
}

function TaskCard({t}:{t:Task}){
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/7 transition-colors">
      <div className="flex items-center gap-2">
        <PriorityDot p={t.priority}/>
        <div className="text-sm">{t.title}</div>
      </div>
      {(t.tags?.length || t.due) ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {t.tags?.map(tag => <Tag key={tag} t={tag} />)}
          {t.due && <span className="text-xs text-zinc-400">Due {t.due}</span>}
        </div>
      ): null}
    </div>
  );
}

export default function TasksNeo(){
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Task>>({priority: "med", status:"today"});

  const today = useMemo(()=>tasks.filter(t => (filter==="all" || t.tags?.includes(filter)) && t.status==="today"),[tasks,filter]);
  const upcoming = useMemo(()=>tasks.filter(t => (filter==="all" || t.tags?.includes(filter)) && t.status==="upcoming"),[tasks,filter]);
  const backlog = useMemo(()=>tasks.filter(t => (filter==="all" || t.tags?.includes(filter)) && t.status==="backlog"),[tasks,filter]);

  const tags = useMemo(()=>{
    const s = new Set<string>();
    tasks.forEach(t => (t.tags||[]).forEach(x => s.add(x)));
    return ["all", ...Array.from(s)];
  },[tasks]);

  function createTask(){
    if(!draft.title) return;
    const id = String(Date.now());
    setTasks(prev => [{ id, title: draft.title!, status: (draft.status as any) ?? "today", priority: draft.priority as any, tags: draft.tags || [], due: draft.due || null}, ...prev]);
    setOpen(false);
    setDraft({priority:"med", status:"today"});
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-zinc-400">Dark + Bento + Glass redesign</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex gap-2">
            {tags.map(t => (
              <button key={t} onClick={()=>setFilter(t)} className={"px-3 py-1.5 rounded-full text-sm border border-white/10 " + (filter===t ? "bg-white/15 text-white" : "bg-transparent text-zinc-300 hover:bg-white/5")}>
                {t}
              </button>
            ))}
          </div>
          <NeoButton onClick={()=>setOpen(true)}>New Task</NeoButton>
        </div>
      </div>

      {/* Overview cards */}
      <div className="bento-grid">
        <div className="bento-span-4">
          <BentoCard title="Today" subtitle={`${today.length} tasks`} right={<span className="text-sm text-zinc-400">Focus</span>}>
            <div className="mt-2 space-y-2">
              {today.map(t => <TaskCard key={t.id} t={t} />)}
              {today.length===0 && <div className="text-sm text-zinc-400">Nothing for today — add one.</div>}
            </div>
          </BentoCard>
        </div>
        <div className="bento-span-4">
          <BentoCard title="Upcoming" subtitle={`${upcoming.length} tasks`} right={<span className="text-sm text-zinc-400">Next</span>}>
            <div className="mt-2 space-y-2">
              {upcoming.map(t => <TaskCard key={t.id} t={t} />)}
              {upcoming.length===0 && <div className="text-sm text-zinc-400">Clean slate — looks good.</div>}
            </div>
          </BentoCard>
        </div>
        <div className="bento-span-4">
          <BentoCard title="Backlog" subtitle={`${backlog.length} tasks`} right={<span className="text-sm text-zinc-400">Later</span>}>
            <div className="mt-2 space-y-2">
              {backlog.map(t => <TaskCard key={t.id} t={t} />)}
              {backlog.length===0 && <div className="text-sm text-zinc-400">No backlog — nice.</div>}
            </div>
          </BentoCard>
        </div>
        <div className="bento-span-12">
          <BentoCard title="Quick Actions" right={<span className="text-sm text-zinc-400">Speed up</span>}>
            <div className="flex flex-wrap gap-2">
              <NeoButton onClick={()=>setOpen(true)}>Add task</NeoButton>
              <NeoButton variant="secondary">Import</NeoButton>
              <NeoButton variant="ghost">Settings</NeoButton>
            </div>
          </BentoCard>
        </div>
      </div>

      {/* Modal */}
      <GlassModal open={open} onOpenChange={setOpen} title="Create task">
        <div className="space-y-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50"
            placeholder="Task title"
            value={draft.title || ""}
            onChange={e=>setDraft(d=>({...d, title: e.target.value}))}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50"
              value={draft.priority}
              onChange={e=>setDraft(d=>({...d, priority: e.target.value as any}))}
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50"
              value={draft.status}
              onChange={e=>setDraft(d=>({...d, status: e.target.value as any}))}
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="backlog">Backlog</option>
            </select>
          </div>
          <input
            type="date"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50"
            value={draft.due || ""}
            onChange={e=>setDraft(d=>({...d, due: e.target.value}))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <NeoButton variant="ghost" onClick={()=>setOpen(false)}>Cancel</NeoButton>
            <NeoButton onClick={createTask}>Create</NeoButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
