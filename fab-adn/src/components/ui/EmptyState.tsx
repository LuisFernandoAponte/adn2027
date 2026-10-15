import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`border border-dashed border-white/10 rounded-2xl p-8 text-center bg-neutral-900/40 flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="p-3 rounded-2xl bg-neutral-900 border border-white/5 text-neutral-500 shadow-sm">
        {icon}
      </div>
      <div className="max-w-xs space-y-1">
        <h4 className="text-sm font-bold text-neutral-200">{title}</h4>
        {description && <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>}
      </div>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded px-2 py-1 bg-red-500/10 border border-red-500/20 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
