import React from "react";
import { DESIGN_TOKENS } from "./designTokens";

export type ButtonVariant = "primary" | "secondary" | "outline-red" | "ghost" | "danger";

interface ButtonDSProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const ButtonDS: React.FC<ButtonDSProps> = ({
  variant = "primary",
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return `${DESIGN_TOKENS.gradients.primary} text-white font-semibold ${DESIGN_TOKENS.shadows.primary}`;
      case "secondary":
        return "border border-white/10 hover:bg-white/5 text-neutral-200 font-medium";
      case "outline-red":
        return "border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold";
      case "ghost":
        return "text-neutral-400 hover:text-white hover:bg-white/5 font-medium";
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-950/60";
      default:
        return `${DESIGN_TOKENS.gradients.primary} text-white font-semibold`;
    }
  };

  const baseClasses = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
    fullWidth ? "w-full" : ""
  } ${getVariantClasses()} ${className}`;

  return (
    <button disabled={disabled || isLoading} className={baseClasses} {...props}>
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
