import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUser, logout } from "@/lib/auth";
import { Wrench, LogOut, User as UserIcon, Shield } from "lucide-react";

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleDisplayName = () => {
    if (!user) return "Cliente VIP";
    if (user.rol) return user.rol;
    if (user.rolId === 1 || user.rol_id === 1) return "Administrador";
    if (user.rolId === 2 || user.rol_id === 2) return "Empleado";
    return "Cliente VIP";
  };

  const isPerfil = location.pathname === "/perfil";

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* LOGO ADN MOTORS */}
        <div
          onClick={() => navigate("/cliente/home")}
          className="flex items-center gap-2 cursor-pointer group"
          title="Ir al Inicio"
        >
          <div className="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 group-hover:scale-105 transition-transform duration-200">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1">
            <span className="adn-logo text-xl font-black tracking-wider text-red-500">ADN</span>
            <span className="text-xs font-bold tracking-widest text-neutral-400">MOTORS</span>
          </div>
        </div>

        {/* SESSION PILL & ACTIONS */}
        <div className="flex items-center gap-3">
          {/* Active Session Pill with Live Green Status */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-white/5 text-xs text-neutral-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-neutral-200">{user?.nombreCompleto || user?.nombre_completo || "Usuario"}</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] font-semibold">
              {getRoleDisplayName()}
            </span>
          </div>

          {/* Navigation Items */}
          {!isPerfil ? (
            <button
              onClick={() => navigate("/perfil")}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-200 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5 text-red-400" />
              <span>Mi Perfil</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/cliente/home")}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-200 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5 text-red-400" />
              <span>Panel Principal</span>
            </button>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-neutral-400 hover:text-red-400 text-xs font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer"
            title="Cerrar Sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
