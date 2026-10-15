import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Wrench, Shield, Package, BarChart3,
  LogOut, Car, ChevronLeft, ChevronRight, Menu, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logout, getUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, path: "/admin/dashboard" },
  { label: "Trabajos", icon: <Wrench className="h-5 w-5" />, path: "/trabajos" },
  { label: "Usuarios", icon: <Users className="h-5 w-5" />, path: "/usuarios" },
  { label: "Roles", icon: <Shield className="h-5 w-5" />, path: "/roles" },
  { label: "Inventario", icon: <Package className="h-5 w-5" />, path: "/admin/inventario" },
  { label: "Reportes", icon: <BarChart3 className="h-5 w-5" />, path: "/admin/reportes" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    return saved === "true";
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("admin_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  // Auto-cerrar drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const user = getUser();

  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has sido desconectado del sistema",
    });
    navigate("/");
  };

  const userInitials = user?.nombre_completo || user?.nombreCompleto
    ? (user.nombre_completo || user.nombreCompleto).split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row relative overflow-x-hidden">
      
      {/* CABECERA TOP MÓVIL (< 768px) */}
      <header className="md:hidden sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2" onClick={() => navigate("/admin/dashboard")}>
          <Car className="h-6 w-6 text-red-500" />
          <span className="font-black text-base text-neutral-100 tracking-wider">
            <span className="text-red-500">ADN</span> MOTORS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-neutral-800 border border-white/10 text-neutral-200 hover:text-white"
            aria-label="Abrir menú de navegación"
          >
            {mobileOpen ? <X className="h-5 w-5 text-red-400" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* DRAWER DESPLAZABLE MÓVIL (< 768px) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop con oscurecimiento y blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            />

            {/* Panel Lateral Móvil */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-neutral-900 border-r border-white/10 flex flex-col justify-between p-4 shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Car className="h-6 w-6 text-red-500" />
                    <span className="font-black text-lg text-neutral-100">
                      <span className="text-red-500">ADN</span> Panel
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Perfil del Usuario Móvil */}
                <div className="flex items-center gap-3 py-4 border-b border-white/10">
                  <Avatar className="h-9 w-9 border border-red-500/30">
                    <AvatarFallback className="bg-red-500/10 text-red-400 font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-100 truncate">{user?.nombre_completo || user?.nombreCompleto || "Admin"}</p>
                    <p className="text-xs text-neutral-400 truncate capitalize">{user?.rol || "Administrador"}</p>
                  </div>
                </div>

                {/* Enlaces de Navegación Móvil */}
                <nav className="mt-4 space-y-1.5">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <motion.button
                        key={item.path}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          navigate(item.path);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all",
                          isActive
                            ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                            : "text-neutral-400 hover:text-neutral-100 hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px]">
                            {item.badge}
                          </Badge>
                        )}
                      </motion.button>
                    );
                  })}
                </nav>
              </div>

              {/* Cerrar Sesión Móvil */}
              <div className="pt-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Cerrar Sesión</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP (>= 768px) */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-40 h-screen bg-neutral-900 border-r border-white/10 transition-all duration-300 flex-col justify-between shadow-2xl",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div>
          {/* Logo Desktop */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            {!collapsed && (
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/admin/dashboard")}>
                <Car className="h-6 w-6 text-red-500" />
                <span className="font-black text-lg text-neutral-100 tracking-wider">
                  <span className="text-red-500">ADN</span> Panel
                </span>
              </div>
            )}
            {collapsed && <Car className="h-6 w-6 text-red-500 mx-auto" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-neutral-400 hover:text-white"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* User info Desktop */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Avatar className="h-8 w-8 border border-red-500/30">
                <AvatarFallback className="bg-red-500/10 text-red-400 text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-100 truncate">{user?.nombre_completo || user?.nombreCompleto || "Admin"}</p>
                <p className="text-[11px] text-neutral-400 truncate capitalize">{user?.rol || "Administrador"}</p>
              </div>
            </div>
          )}

          {/* Navigation Desktop */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all text-xs font-bold",
                    collapsed ? "px-2" : "px-3",
                    isActive
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                      : "text-neutral-400 hover:text-neutral-100 hover:bg-white/5"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <span className={cn("flex-shrink-0", collapsed ? "mx-auto" : "mr-3")}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Logout Desktop */}
        <div className="p-2 border-t border-white/10">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-bold",
              collapsed ? "px-2" : "px-3"
            )}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-5 w-5 flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL ADAPTABLE */}
      <main className={cn("flex-1 transition-all duration-300 w-full min-w-0", collapsed ? "md:ml-16" : "md:ml-64")}>
        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
