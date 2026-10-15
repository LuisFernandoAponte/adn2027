// src/components/ui/designTokens.ts
// Fuente Única de Verdad para Design System "ADN MOTORS"

export const DESIGN_TOKENS = {
  colors: {
    bgBase: "bg-neutral-950",
    bgSurface: "bg-neutral-900/60",
    bgSurfaceHover: "hover:bg-neutral-900/90",
    borderBase: "border-white/5",
    borderSubtle: "border-white/10",
    borderAccent: "border-red-900/40",
    textPrimary: "text-neutral-100",
    textSecondary: "text-neutral-400",
    textMuted: "text-neutral-500",
    label: "text-xs font-semibold uppercase tracking-wider text-neutral-400",
  },
  gradients: {
    primary: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400",
    headerBanner: "bg-gradient-to-br from-red-600 via-red-800 to-red-950",
    progress: "bg-gradient-to-r from-red-600 to-red-500",
  },
  shadows: {
    primary: "shadow-lg shadow-red-950/50",
    card: "shadow-md shadow-black/40",
    modal: "shadow-2xl shadow-black/80",
  },
  semantics: {
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/20",
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/20",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-300",
      border: "border-red-500/20",
    },
  },
  radii: {
    card: "rounded-2xl",
    button: "rounded-xl",
    badge: "rounded-full",
  },
  layout: {
    container: "max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6",
  },
} as const;
