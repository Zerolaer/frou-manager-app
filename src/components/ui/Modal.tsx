import React from "react";

type ModalProps = {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;

  /** New: left and right footer slots */
  footerStart?: React.ReactNode;
  footerEnd?: React.ReactNode;

  /** Back-compat: if your app passes a single footer, it will render on the right side */
  footer?: React.ReactNode;
};

export default function Modal({
  open,
  title,
  onClose,
  children,
  footerStart,
  footerEnd,
  footer,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[620px] bg-white rounded-2xl shadow-xl outline-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-auto">
          {children}
        </div>

        {/* Footer with two zones */}
        {(footerStart || footerEnd || footer) && (
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">{footerStart}</div>
              <div className="flex items-center gap-2">
                {/* If legacy single `footer` is provided, render it on the right side */}
                {footerEnd ?? footer}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
