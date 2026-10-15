import React from "react";
import { DESIGN_TOKENS } from "./designTokens";

// ── CardDS Component ──
interface CardDSProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const CardDS: React.FC<CardDSProps> = ({
  children,
  className = "",
  onClick,
  hoverEffect = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`${DESIGN_TOKENS.colors.bgSurface} ${DESIGN_TOKENS.colors.borderBase} border ${
        DESIGN_TOKENS.radii.card
      } p-5 ${DESIGN_TOKENS.shadows.card} ${
        hoverEffect
          ? "hover:border-red-900/40 hover:-translate-y-0.5 transition-all duration-200"
          : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
};

// ── StatCard Component ──
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "emerald" | "blue" | "purple" | "amber" | "red";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
}) => {
  const getSemanticStyles = () => {
    switch (variant) {
      case "emerald":
        return DESIGN_TOKENS.semantics.emerald;
      case "purple":
        return DESIGN_TOKENS.semantics.purple;
      case "amber":
        return DESIGN_TOKENS.semantics.amber;
      case "red":
        return DESIGN_TOKENS.semantics.red;
      case "blue":
      default:
        return DESIGN_TOKENS.semantics.blue;
    }
  };

  const sem = getSemanticStyles();

  return (
    <CardDS className="flex items-center justify-between gap-3 overflow-hidden relative p-4">
      <div className="space-y-1 min-w-0 flex-1">
        <span className={`${DESIGN_TOKENS.colors.label} block text-[10px] sm:text-xs font-bold uppercase leading-tight line-clamp-2`}>
          {title}
        </span>
        <div className="text-base sm:text-lg md:text-xl font-black text-neutral-100 font-mono tracking-tight whitespace-nowrap">
          {value}
        </div>
        {subtitle && <p className="text-[11px] text-neutral-400 truncate">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-2xl ${sem.bg} border ${sem.border} ${sem.text} shrink-0 flex items-center justify-center`}>
        {icon}
      </div>
    </CardDS>
  );
};

// ── ActionCard Component ──
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "purple";
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  buttonText,
  onClick,
  variant = "secondary",
}) => {
  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return `${DESIGN_TOKENS.semantics.blue.bg} ${DESIGN_TOKENS.semantics.blue.border} ${DESIGN_TOKENS.semantics.blue.text}`;
      case "danger":
        return `${DESIGN_TOKENS.semantics.red.bg} ${DESIGN_TOKENS.semantics.red.border} text-red-500 animate-pulse`;
      case "purple":
        return `${DESIGN_TOKENS.semantics.purple.bg} ${DESIGN_TOKENS.semantics.purple.border} ${DESIGN_TOKENS.semantics.purple.text}`;
      case "secondary":
      default:
        return "bg-neutral-800 border-white/10 text-neutral-300";
    }
  };

  return (
    <CardDS
      onClick={onClick}
      className="flex flex-col justify-between h-full border border-white/5 hover:border-red-900/40"
    >
      <div>
        <div className={`p-3 w-fit rounded-2xl border mb-3.5 shadow-sm ${getIconStyles()}`}>
          {icon}
        </div>
        <h3 className="text-base font-bold text-neutral-100 mb-1">{title}</h3>
        <p className="text-xs text-neutral-400 leading-relaxed mb-4">{description}</p>
      </div>

      <button
        type="button"
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none ${
          variant === "danger"
            ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-950/50"
            : variant === "primary"
            ? `${DESIGN_TOKENS.gradients.primary} text-white shadow-lg shadow-red-950/50`
            : "border border-white/10 hover:bg-white/5 text-neutral-200"
        }`}
      >
        {buttonText}
      </button>
    </CardDS>
  );
};

// ── SectionHeader Component ──
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/5">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-red-500">{icon}</span>}
        <div>
          <h2 className="text-lg font-bold text-neutral-100 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ── ProgressBar Component ──
interface ProgressBarProps {
  percentage: number;
  label?: string;
  microcopy?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  microcopy,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={DESIGN_TOKENS.colors.label}>{label || "Progreso"}</span>
        <span className="font-mono font-bold text-red-400">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-neutral-800 overflow-hidden p-0.5 border border-white/5">
        <div
          className={`h-full rounded-full ${DESIGN_TOKENS.gradients.progress} transition-all duration-500 ease-out shadow-sm shadow-red-500/30`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {microcopy && <p className="text-xs text-neutral-400 italic">{microcopy}</p>}
    </div>
  );
};
