import React from "react";
import { cn } from "@/lib/cn";

interface Props {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  padding?: "sm" | "md" | "lg";
}

export const BentoCard: React.FC<Props> = ({
  title,
  subtitle,
  right,
  className,
  children,
  padding = "lg",
}) => {
  const pad = padding === "lg" ? "p-6" : padding === "md" ? "p-4" : "p-3";

  return (
    <section className={cn("glass rounded-3xl animate-card-in", pad, className)}>
      {(title || right || subtitle) && (
        <header className="mb-4 flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-medium leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
          </div>
          {right && <div className="ml-4 shrink-0">{right}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
};