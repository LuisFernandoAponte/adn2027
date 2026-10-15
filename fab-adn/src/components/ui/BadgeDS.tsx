import React from "react";
import { DESIGN_TOKENS } from "./designTokens";

export type BadgeVariant = "role" | "vip" | "verified" | "pending" | "neutral" | "emerald" | "blue" | "purple" | "amber" | "red";

interface BadgeDSProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const BadgeDS: React.FC<BadgeDSProps> = ({
  variant = "neutral",
  children,
  className = "",
  icon,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "role":
      case "red":
        return `${DESIGN_TOKENS.semantics.red.bg} ${DESIGN_TOKENS.semantics.red.text} ${DESIGN_TOKENS.semantics.red.border}`;
      case "vip":
      case "amber":
      case "pending":
        return `${DESIGN_TOKENS.semantics.amber.bg} ${DESIGN_TOKENS.semantics.amber.text} ${DESIGN_TOKENS.semantics.amber.border}`;
      case "verified":
      case "emerald":
        return `${DESIGN_TOKENS.semantics.emerald.bg} ${DESIGN_TOKENS.semantics.emerald.text} ${DESIGN_TOKENS.semantics.emerald.border}`;
      case "blue":
        return `${DESIGN_TOKENS.semantics.blue.bg} ${DESIGN_TOKENS.semantics.blue.text} ${DESIGN_TOKENS.semantics.blue.border}`;
      case "purple":
        return `${DESIGN_TOKENS.semantics.purple.bg} ${DESIGN_TOKENS.semantics.purple.text} ${DESIGN_TOKENS.semantics.purple.border}`;
      case "neutral":
      default:
        return "bg-neutral-800 text-neutral-300 border border-white/5";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 border text-xs font-semibold rounded-full tracking-wide shadow-sm ${getVariantStyles()} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
