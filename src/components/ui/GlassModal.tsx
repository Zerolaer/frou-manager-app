
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { Portal } from "@/components/ui/Portal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnOverlay?: boolean;
}

export const GlassModal: React.FC<Props> = ({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
  size = "md",
  closeOnOverlay = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      // trap focus within modal
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        const list = Array.from(focusables).filter(el => !el.hasAttribute("disabled"));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
  };

  if (!open) return null;

  return (
    <Portal>
      <div
        aria-hidden
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={() => closeOnOverlay && onOpenChange(false)}
      />
      <div className="fixed inset-0 z-[70] grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          ref={ref}
          className={cn("glass rounded-3xl w-full", sizes[size], "p-6 animate-modal-in", className)}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <header className="mb-4">
              {title && <h3 className="text-lg font-semibold leading-tight">{title}</h3>}
              {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
            </header>
          )}
          <div>{children}</div>
        </div>
      </div>
    </Portal>
  );
};
