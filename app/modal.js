"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[88vh] flex flex-col animate-slide-up mx-0 sm:mx-4">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-4 shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100 w-8 h-8 flex items-center justify-center text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
