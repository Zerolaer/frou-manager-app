
import React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  pill?: boolean;
  block?: boolean;
}

export const NeoButton: React.FC<Props> = ({
  className,
  variant = "primary",
  pill,
  block,
  ...props
}) => {
  const base = "relative inline-flex items-center justify-center select-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none";
  const sizing = "px-4 py-2 text-sm";
  const radius = pill ? "rounded-full" : "rounded-2xl";
  const w = block ? "w-full" : "";

  const variants: Record<Variant, string> = {
    primary: "bg-white/10 text-white border border-white/10 hover:bg-white/15 glow-hover",
    secondary: "bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-white border border-white/10 hover:from-blue-500/25 hover:to-purple-500/25 glow-hover",
    ghost: "bg-transparent text-zinc-300 border border-white/10 hover:bg-white/5",
  };

  return (
    <button
      className={cn(base, sizing, radius, w, variants[variant], className)}
      {...props}
    />
  );
};
