import React, { useState } from "react";
import { BentoCard } from "@/components/ui/BentoCard";
import { NeoButton } from "@/components/ui/NeoButton";
import { GlassModal } from "@/components/ui/GlassModal";

export default function StylePreview() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6 space-y-6">
      <div className="bento-grid">
        <div className="bento-span-6">
          <BentoCard title="Revenue" subtitle="This month" right={<span className='text-sm text-zinc-400'>€ 8,420</span>}>
            <div className="h-24 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
          </BentoCard>
        </div>
        <div className="bento-span-6">
          <BentoCard title="Tasks" subtitle="Today">
            <ul className="text-sm text-zinc-300 space-y-2">
              <li>• Update onboarding flow</li>
              <li>• Fix modal z-index stacking</li>
              <li>• Add keyboard nav for menus</li>
            </ul>
          </BentoCard>
        </div>
        <div className="bento-span-12">
          <BentoCard title="Quick actions" right={<NeoButton onClick={()=>setOpen(true)}>Open modal</NeoButton>}>
            <div className="flex gap-3">
              <NeoButton>Create</NeoButton>
              <NeoButton variant="secondary">Import</NeoButton>
              <NeoButton variant="ghost">Settings</NeoButton>
            </div>
          </BentoCard>
        </div>
      </div>

      <GlassModal open={open} onOpenChange={setOpen} title="Create task">
        <div className="space-y-4">
          <input className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50" placeholder="Task title" />
          <textarea className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 h-28 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/50" placeholder="Description" />
          <div className="flex justify-end gap-2">
            <NeoButton variant="ghost" onClick={() => setOpen(false)}>Cancel</NeoButton>
            <NeoButton>Save</NeoButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}