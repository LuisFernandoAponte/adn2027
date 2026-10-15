import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Usuario } from "@/types/usuario";
import {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  activarUsuario,
} from "@/api/usuarioApi";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  RefreshCw,
  Shield,
  Wrench,
  User
} from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { StatCard, SectionHeader } from "@/components/ui/DesignSystem";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { useToast } from "@/hooks/use-toast";
import ModalUsuario from "@/components/usuarios/ModalUsuario";
import TablaUsuarios from "@/components/usuarios/TablaUsuarios";

const GestionUsuarios: React.FC = () => {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs y Búsqueda
  const [tabFiltro, setTabFiltro] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const cargarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obtenerUsuarios();
      setUsuarios(data);
    } catch (error: any) {
      console.error("Error al cargar usuarios:", error);
      toast({
        title: "Error al cargar usuarios",
        description: error.message || "No se pudo obtener la lista de usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleToggleEstado = async (id: string, estadoActual: number | boolean) => {
    const isActivoAct = estadoActual === 1 || estadoActual === true;
    const nuevoEstado = isActivoAct ? 0 : 1;

    // Optimistic Update en UI para respuesta instantánea en KPIs y Tabla
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, estado: nuevoEstado } : u))
    );

    try {
      if (isActivoAct) {
        await desactivarUsuario(id);
        toast({ title: "Usuario Desactivado", description: "Acceso revocado en BD." });
      } else {
        await activarUsuario(id);
        toast({ title: "Usuario Activado", description: "Acceso habilitado en BD." });
      }
      await cargarUsuarios();
    } catch (error: any) {
      // Rollback en caso de falla
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, estado: isActivoAct ? 1 : 0 } : u))
      );
      toast({
        title: "Error de sincronización BD",
        description: error.response?.data?.error || error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditar = (user: Usuario) => {
    setUsuarioEditar(user);
    setOpenModal(true);
  };

  const handleCrear = () => {
    setUsuarioEditar(null);
    setOpenModal(true);
  };

  const handleCerrarModal = () => {
    setOpenModal(false);
    setUsuarioEditar(null);
  };

  const guardarUsuario = async (data: any) => {
    try {
      if (usuarioEditar) {
        const payload: Record<string, unknown> = { ...data };
        if (!data.password) delete payload.password;
        await actualizarUsuario(usuarioEditar.id, payload);
        toast({ title: "Usuario Actualizado", description: "Cambios guardados con éxito." });
      } else {
        await crearUsuario(data);
        toast({ title: "¡Usuario Registrado!", description: "Se creó la cuenta y vinculación en BD." });
      }
      handleCerrarModal();
      await cargarUsuarios();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Error al guardar usuario";
      toast({ title: "Error al guardar", description: msg, variant: "destructive" });
    }
  };

  // Filtrado memorizado
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const rolStr = (u.rol || "").toLowerCase();
      const isActivo = u.estado === 1 || (u.estado as any) === true;

      let tabMatch = true;
      if (tabFiltro === "Staff") {
        tabMatch = rolStr === "administrador" || rolStr === "empleado" || rolStr === "admin";
      } else if (tabFiltro === "Clientes") {
        tabMatch = rolStr === "cliente";
      } else if (tabFiltro === "Inactivos") {
        tabMatch = !isActivo;
      }

      if (!tabMatch) return false;
      if (!debouncedSearch) return true;

      const name = (u.nombre_completo || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.telefono || "").toLowerCase();
      const cargo = (u.cargo || "").toLowerCase();

      return (
        name.includes(debouncedSearch) ||
        email.includes(debouncedSearch) ||
        phone.includes(debouncedSearch) ||
        cargo.includes(debouncedSearch)
      );
    });
  }, [usuarios, tabFiltro, debouncedSearch]);

  const totalActivos = useMemo(
    () => usuarios.filter((u) => u.estado === 1 || (u.estado as any) === true).length,
    [usuarios]
  );
  const totalStaff = useMemo(
    () => usuarios.filter((u) => u.rol === "Administrador" || u.rol === "Empleado" || u.rol === "admin").length,
    [usuarios]
  );
  const totalClientes = useMemo(
    () => usuarios.filter((u) => u.rol === "Cliente" || u.rol === "cliente").length,
    [usuarios]
  );

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-16`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Users className="h-7 w-7 text-red-500" />
              <span>Gestión de Usuarios & Cuentas</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Administración centralizada de Empleados, Administradores y Clientes de ADN Motors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={cargarUsuarios}>
              Actualizar
            </ButtonDS>
            <ButtonDS variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={handleCrear}>
              Registrar Usuario
            </ButtonDS>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <StatCard
            title="Total Registrados"
            value={usuarios.length}
            subtitle="Base general de usuarios"
            icon={<Users className="h-6 w-6" />}
            variant="blue"
          />
          <StatCard
            title="Personal / Staff"
            value={totalStaff}
            subtitle="Admins y Mecánicos"
            icon={<Shield className="h-6 w-6" />}
            variant="purple"
          />
          <StatCard
            title="Clientes"
            value={totalClientes}
            subtitle="Propietarios de vehículos"
            icon={<User className="h-6 w-6" />}
            variant="amber"
          />
          <StatCard
            title="Cuentas Activas"
            value={totalActivos}
            subtitle="Con acceso habilitado"
            icon={<UserCheck className="h-6 w-6" />}
            variant="emerald"
          />
        </div>

        {/* Búsqueda y Filtros Tabs */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {["Todos", "Staff", "Clientes", "Inactivos"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTabFiltro(tab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    tabFiltro === tab
                      ? "bg-red-500/10 text-red-300 border border-red-500/30 font-bold"
                      : "bg-neutral-900/60 border border-white/5 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Usuarios */}
          {loading ? (
            <div className="h-64 rounded-2xl bg-neutral-900/60 border border-white/5 animate-pulse p-6 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-red-500 animate-spin mr-2" />
              <span className="text-xs text-neutral-400 font-medium">Cargando directorio de usuarios...</span>
            </div>
          ) : (
            <TablaUsuarios
              usuarios={usuariosFiltrados}
              onEditar={handleEditar}
              onToggleEstado={handleToggleEstado}
            />
          )}
        </div>

        {/* Modal de Usuario */}
        <ModalUsuario
          isOpen={openModal}
          onClose={handleCerrarModal}
          onGuardar={guardarUsuario}
          usuarioEditar={usuarioEditar}
        />
      </main>
    </div>
  );
};

export default GestionUsuarios;
