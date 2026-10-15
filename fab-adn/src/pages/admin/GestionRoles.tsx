import React, { useState, useEffect, useMemo } from "react";
import {
  Shield, Plus, Trash2, Edit2, Check, X, Key, Users, RefreshCw,
  AlertTriangle, Search, Info, CheckSquare, Square, Lock, UserCheck,
  ChevronRight, Sparkles, FileText, ArrowRight, ShieldAlert, Wrench,
  Calendar, Package, DollarSign, BarChart3, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  obtenerRoles,
  obtenerPermisos,
  crearRol,
  actualizarRol,
  eliminarRol,
  crearPermiso,
  actualizarPermiso,
  eliminarPermiso,
  asignarPermisosARol,
  obtenerUsuariosDeRol,
  type Rol,
  type Permiso,
  type UsuarioRol,
} from "@/api/rolPermisoApi";
import { Navbar } from "@/components/ui/Navbar";
import { ButtonDS } from "@/components/ui/ButtonDS";
import { BadgeDS } from "@/components/ui/BadgeDS";
import { CardDS } from "@/components/ui/DesignSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DESIGN_TOKENS } from "@/components/ui/designTokens";
import { CATALOGO_PERMISOS, resolverPermisoMeta, MODULOS_SISTEMA } from "./rbacCatalog";

export const GestionRoles: React.FC = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rol Seleccionado & Estado Edición Permisos (Dirty State Tracking)
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  // Filtros de búsqueda
  const [searchRolTerm, setSearchRolTerm] = useState("");
  const [searchPermisoTerm, setSearchPermisoTerm] = useState("");

  // Modales
  const [modalRolOpen, setModalRolOpen] = useState(false);
  const [editandoRol, setEditandoRol] = useState<Rol | null>(null);
  const [nombreRolForm, setNombreRolForm] = useState("");
  const [descRolForm, setDescRolForm] = useState("");
  const [guardandoRol, setGuardandoRol] = useState(false);

  const [modalUsuariosOpen, setModalUsuariosOpen] = useState(false);
  const [usuariosDelRol, setUsuariosDelRol] = useState<UsuarioRol[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  const [modalDeleteConfirmOpen, setModalDeleteConfirmOpen] = useState(false);
  const [rolAEliminar, setRolAEliminar] = useState<Rol | null>(null);
  const [eliminandoRol, setEliminandoRol] = useState(false);

  // Carga inicial de datos
  const cargarDatos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [rolesData, permisosData] = await Promise.all([
        obtenerRoles(),
        obtenerPermisos(),
      ]);
      setRoles(rolesData);
      setPermisos(permisosData);

      // Si ya hay un rol seleccionado, re-sincronizar
      if (rolSeleccionado) {
        const rolActualizado = rolesData.find((r) => r.id === rolSeleccionado.id);
        if (rolActualizado) {
          setRolSeleccionado(rolActualizado);
          setPermisosSeleccionados(rolActualizado.permisos.map((p) => p.id));
        }
      } else if (rolesData.length > 0) {
        // Seleccionar el primer rol por defecto
        setRolSeleccionado(rolesData[0]);
        setPermisosSeleccionados(rolesData[0].permisos.map((p) => p.id));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar la matriz de roles y permisos");
      toast({
        title: "Error de Carga",
        description: err.message || "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Comprobar si hay cambios sin guardar en el rol seleccionado (Dirty State)
  const hayCambiosSinGuardar = useMemo(() => {
    if (!rolSeleccionado) return false;
    const originales = new Set(rolSeleccionado.permisos.map((p) => p.id));
    const actuales = new Set(permisosSeleccionados);
    if (originales.size !== actuales.size) return true;
    for (let id of originales) {
      if (!actuales.has(id)) return true;
    }
    return false;
  }, [rolSeleccionado, permisosSeleccionados]);

  // Selección de Rol
  const handleSeleccionarRol = (rol: Rol) => {
    if (hayCambiosSinGuardar) {
      if (!window.confirm("Tienes cambios sin guardar en los permisos actuales. ¿Deseas descartarlos y cambiar de rol?")) {
        return;
      }
    }
    setRolSeleccionado(rol);
    setPermisosSeleccionados(rol.permisos.map((p) => p.id));
  };

  // Revertir cambios no guardados
  const handleRevertirCambios = () => {
    if (rolSeleccionado) {
      setPermisosSeleccionados(rolSeleccionado.permisos.map((p) => p.id));
      toast({ title: "Cambios descartados", description: "Se restauró la configuración original del rol." });
    }
  };

  // Guardar Cambios de Permisos del Rol
  const handleGuardarPermisosSubmit = async () => {
    if (!rolSeleccionado) return;
    setGuardandoPermisos(true);
    try {
      await asignarPermisosARol(rolSeleccionado.id, permisosSeleccionados);
      toast({
        title: "¡Permisos Guardados!",
        description: `Se actualizaron correctamente los accesos para el rol "${rolSeleccionado.descripcion}".`,
      });
      await cargarDatos();
    } catch (err: any) {
      toast({
        title: "Error al guardar permisos",
        description: err.message || "No se pudieron actualizar los permisos",
        variant: "destructive",
      });
    } finally {
      setGuardandoPermisos(false);
    }
  };

  // Modal Crear / Editar Rol Handlers
  const handleOpenModalCrearRol = () => {
    setEditandoRol(null);
    setNombreRolForm("");
    setDescRolForm("");
    setModalRolOpen(true);
  };

  const handleOpenModalEditarRol = (rol: Rol, e: React.MouseEvent) => {
    e.stopPropagation();
    if (rol.esSistema) {
      toast({ title: "Rol del Sistema Protegido", description: "Los roles principales del sistema no pueden renombrarse.", variant: "destructive" });
      return;
    }
    setEditandoRol(rol);
    setNombreRolForm(rol.descripcion);
    setDescRolForm("");
    setModalRolOpen(true);
  };

  const handleGuardarRolModal = async () => {
    if (!nombreRolForm.trim()) {
      toast({ title: "Campo Requerido", description: "Ingresa el nombre del rol", variant: "destructive" });
      return;
    }
    setGuardandoRol(true);
    try {
      if (editandoRol) {
        await actualizarRol(editandoRol.id, nombreRolForm.trim());
        toast({ title: "Rol Actualizado", description: `El rol fue renombrado a "${nombreRolForm.trim()}".` });
      } else {
        const res = await crearRol(nombreRolForm.trim());
        toast({ title: "Rol Creado", description: `Se registró con éxito el nuevo rol "${nombreRolForm.trim()}".` });
        if (res.rol) {
          setRolSeleccionado(res.rol);
          setPermisosSeleccionados([]);
        }
      }
      setModalRolOpen(false);
      await cargarDatos();
    } catch (err: any) {
      toast({ title: "Error en el Rol", description: err.message, variant: "destructive" });
    } finally {
      setGuardandoRol(false);
    }
  };

  // Abrir Modal de Usuarios asignados al Rol
  const handleVerUsuariosDeRol = async (rol: Rol, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRolSeleccionado(rol);
    setModalUsuariosOpen(true);
    setCargandoUsuarios(true);
    try {
      const list = await obtenerUsuariosDeRol(rol.id);
      setUsuariosDelRol(list);
    } catch (err) {
      setUsuariosDelRol(rol.usuarios || []);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  // Modal Confirmar Eliminación de Rol
  const handleOpenDeleteRol = (rol: Rol, e: React.MouseEvent) => {
    e.stopPropagation();
    if (rol.esSistema) {
      toast({ title: "Operación no permitida", description: `El rol "${rol.descripcion}" es un rol protegido del sistema.`, variant: "destructive" });
      return;
    }
    if ((rol.usuariosCount || 0) > 0) {
      toast({ title: "Rol con Usuarios Activos", description: `No puedes eliminar el rol "${rol.descripcion}" porque tiene ${rol.usuariosCount} usuarios asignados.`, variant: "destructive" });
      return;
    }
    setRolAEliminar(rol);
    setModalDeleteConfirmOpen(true);
  };

  const handleConfirmarEliminarRol = async () => {
    if (!rolAEliminar) return;
    setEliminandoRol(true);
    try {
      await eliminarRol(rolAEliminar.id);
      toast({ title: "Rol Elimando", description: `Se eliminó el rol "${rolAEliminar.descripcion}".` });
      if (rolSeleccionado?.id === rolAEliminar.id) {
        setRolSeleccionado(null);
        setPermisosSeleccionados([]);
      }
      setModalDeleteConfirmOpen(false);
      await cargarDatos();
    } catch (err: any) {
      toast({ title: "Error al eliminar rol", description: err.message, variant: "destructive" });
    } finally {
      setEliminandoRol(false);
    }
  };

  // Toggle de un permiso individual
  const togglePermiso = (permisoId: string) => {
    setPermisosSeleccionados((prev) =>
      prev.includes(permisoId) ? prev.filter((id) => id !== permisoId) : [...prev, permisoId]
    );
  };

  // Toggle de selección masiva por Módulo
  const toggleModuloCompleto = (permisosDelModulo: Permiso[]) => {
    const idsModulo = permisosDelModulo.map((p) => p.id);
    const todosSeleccionados = idsModulo.every((id) => permisosSeleccionados.includes(id));

    if (todosSeleccionados) {
      // Desmarcar todos los de este módulo
      setPermisosSeleccionados((prev) => prev.filter((id) => !idsModulo.includes(id)));
    } else {
      // Agregar los faltantes de este módulo
      setPermisosSeleccionados((prev) => Array.from(new Set([...prev, ...idsModulo])));
    }
  };

  // Enriquecer y Agrupar Permisos por Módulo con Metadata
  const permisosAgrupados = useMemo(() => {
    const searchNorm = searchPermisoTerm.trim().toLowerCase();

    // Map de permisos con metadata enriquecida
    const enriquecidos = permisos.map((p) => {
      const meta = resolverPermisoMeta(p.permiso);
      return {
        id: p.id,
        permiso: p.permiso,
        nombre: meta.nombre,
        modulo: meta.modulo,
        descripcion: meta.descripcion,
        esCritico: meta.esCritico
      };
    });

    // Filtrar por término de búsqueda
    const filtrados = enriquecidos.filter((p) => {
      if (!searchNorm) return true;
      return (
        p.nombre.toLowerCase().includes(searchNorm) ||
        p.permiso.toLowerCase().includes(searchNorm) ||
        p.modulo.toLowerCase().includes(searchNorm) ||
        p.descripcion.toLowerCase().includes(searchNorm)
      );
    });

    // Agrupar por módulo
    const grupos: { [key: string]: typeof filtrados } = {};
    filtrados.forEach((p) => {
      if (!grupos[p.modulo]) grupos[p.modulo] = [];
      grupos[p.modulo].push(p);
    });

    return grupos;
  }, [permisos, searchPermisoTerm]);

  // Filtrado de roles por término de búsqueda
  const rolesFiltrados = useMemo(() => {
    if (!searchRolTerm.trim()) return roles;
    const norm = searchRolTerm.toLowerCase();
    return roles.filter((r) => r.descripcion.toLowerCase().includes(norm));
  }, [roles, searchRolTerm]);

  const totalPermisosSistema = permisos.length;
  const asignadosCount = permisosSeleccionados.length;

  return (
    <div className={`min-h-screen ${DESIGN_TOKENS.colors.bgBase} ${DESIGN_TOKENS.colors.textPrimary} pb-24`}>
      <Navbar />

      <main className={DESIGN_TOKENS.layout.container}>
        {/* Header Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight flex items-center gap-2.5">
              <Shield className="h-7 w-7 text-red-500" />
              <span>Roles y Permisos (RBAC)</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Gestiona los roles operativos y la matriz de seguridad del sistema automotriz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ButtonDS variant="primary" icon={<Plus className="h-4 w-4" />} onClick={handleOpenModalCrearRol}>
              Crear Nuevo Rol
            </ButtonDS>
            <ButtonDS variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={cargarDatos} disabled={loading}>
              Actualizar
            </ButtonDS>
          </div>
        </div>

        {/* Layout Principal 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          
          {/* PANEL IZQUIERDO: ROLES DEL SISTEMA (4 Col) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-red-500" />
                Roles Registrados
                <span className="text-xs font-mono font-bold bg-neutral-900 border border-white/10 text-red-400 px-2 py-0.5 rounded-lg">
                  {roles.length}
                </span>
              </h3>
            </div>

            {/* Buscador de Roles */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar rol..."
                value={searchRolTerm}
                onChange={(e) => setSearchRolTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900/80 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500"
              />
            </div>

            {/* Lista de Tarjetas de Roles */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-neutral-900/60 border border-white/5 animate-pulse" />
                ))}
              </div>
            ) : rolesFiltrados.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-white/5 space-y-2">
                <Shield className="h-8 w-8 text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-400">No se encontraron roles.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {rolesFiltrados.map((rol) => {
                  const isSelected = rolSeleccionado?.id === rol.id;
                  return (
                    <div
                      key={rol.id}
                      onClick={() => handleSeleccionarRol(rol)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? "bg-neutral-900 border-red-500/60 shadow-lg shadow-red-500/10 ring-1 ring-red-500/30"
                          : "bg-neutral-950/80 border-white/5 hover:border-white/20 hover:bg-neutral-900/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-100">{rol.descripcion}</span>
                            {rol.esSistema ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" /> Sistema
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 border border-white/10 px-2 py-0.5 rounded-md">
                                Personalizado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {!rol.esSistema && (
                            <button
                              onClick={(e) => handleOpenModalEditarRol(rol, e)}
                              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                              title="Renombrar Rol"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!rol.esSistema && (
                            <button
                              onClick={(e) => handleOpenDeleteRol(rol, e)}
                              className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                              title="Eliminar Rol"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Métricas del Rol */}
                      <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <Key className="h-3.5 w-3.5 text-red-400" />
                          <span><strong className="text-neutral-200 font-mono">{rol.permisosCount || rol.permisos.length}</strong> permisos</span>
                        </div>

                        <button
                          onClick={(e) => handleVerUsuariosDeRol(rol, e)}
                          className="flex items-center gap-1.5 text-neutral-400 hover:text-red-400 transition-colors text-left font-medium"
                        >
                          <Users className="h-3.5 w-3.5 text-blue-400" />
                          <span><strong className="text-neutral-200 font-mono">{rol.usuariosCount || 0}</strong> usuarios</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANEL DERECHO: MATRIZ DE ASIGNACIÓN DE PERMISOS (8 Col) */}
          <div className="lg:col-span-8 space-y-4">
            {!rolSeleccionado ? (
              /* Estado Vacío cuando no hay rol seleccionado */
              <div className="p-12 text-center rounded-3xl bg-neutral-950 border border-white/5 space-y-4 flex flex-col items-center justify-center min-h-[420px]">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  <Shield className="h-10 w-10" />
                </div>
                <h3 className="text-lg font-bold text-neutral-200">Selecciona un Rol de la Lista</h3>
                <p className="text-xs text-neutral-400 max-w-md">
                  Haz clic en cualquiera de los roles del panel izquierdo para consultar, auditar y modificar su matriz de permisos y accesos operativos.
                </p>
                <ButtonDS variant="primary" icon={<Plus className="h-4 w-4" />} onClick={handleOpenModalCrearRol}>
                  Crear Nuevo Rol
                </ButtonDS>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Banner de Cabecera del Rol Seleccionado */}
                <div className="p-5 rounded-3xl bg-neutral-900 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-neutral-100">{rolSeleccionado.descripcion}</h2>
                      {rolSeleccionado.esSistema ? (
                        <BadgeDS variant="amber" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Rol del Sistema
                        </BadgeDS>
                      ) : (
                        <BadgeDS variant="neutral">Rol Personalizado</BadgeDS>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-400 pt-0.5">
                      <span>
                        Asignados: <strong className="text-red-400 font-mono">{asignadosCount}</strong> de <strong className="text-neutral-200 font-mono">{totalPermisosSistema}</strong> permisos
                      </span>
                      <span>•</span>
                      <button
                        onClick={() => handleVerUsuariosDeRol(rolSeleccionado)}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span><strong>{rolSeleccionado.usuariosCount || 0}</strong> usuarios asociados</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ButtonDS variant="secondary" icon={<Users className="h-4 w-4" />} onClick={() => handleVerUsuariosDeRol(rolSeleccionado)}>
                      Ver Usuarios
                    </ButtonDS>
                  </div>
                </div>

                {/* Buscador de Permisos por Palabra Clave */}
                <div className="relative">
                  <Search className="h-4 w-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar permiso en todos los módulos (ej: 'factura', 'eliminar', 'citas')..."
                    value={searchPermisoTerm}
                    onChange={(e) => setSearchPermisoTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-900 border border-white/10 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-neutral-500 shadow-inner"
                  />
                </div>

                {/* Módulos Agrupados de Permisos */}
                <div className="space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                  {Object.keys(permisosAgrupados).length === 0 ? (
                    <div className="p-8 text-center text-xs text-neutral-500 rounded-2xl bg-neutral-950 border border-white/5">
                      No se encontraron permisos coincidentes con "{searchPermisoTerm}".
                    </div>
                  ) : (
                    Object.entries(permisosAgrupados).map(([moduloNombre, items]) => {
                      const todosChecked = items.every((p) => permisosSeleccionados.includes(p.id));
                      const algunoChecked = items.some((p) => permisosSeleccionados.includes(p.id));
                      const cantidadAsignada = items.filter((p) => permisosSeleccionados.includes(p.id)).length;

                      return (
                        <div key={moduloNombre} className="rounded-2xl bg-neutral-950 border border-white/5 overflow-hidden">
                          {/* Modulo Header */}
                          <div className="p-3.5 bg-neutral-900/90 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                                {moduloNombre}
                              </h4>
                              <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 border border-white/5 px-2 py-0.5 rounded-md">
                                {cantidadAsignada} / {items.length}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleModuloCompleto(items)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 transition-colors"
                            >
                              {todosChecked ? (
                                <>
                                  <CheckSquare className="h-3.5 w-3.5 text-red-500" /> Desmarcar todos
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5 text-neutral-500" /> Seleccionar todos
                                </>
                              )}
                            </button>
                          </div>

                          {/* Grid de Permisos dentro del Módulo */}
                          <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {items.map((permiso) => {
                              const isChecked = permisosSeleccionados.includes(permiso.id);
                              return (
                                <div
                                  key={permiso.id}
                                  onClick={() => togglePermiso(permiso.id)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none space-y-1 ${
                                    isChecked
                                      ? "bg-red-500/10 border-red-500/30 text-neutral-100 shadow-sm"
                                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:border-white/10 hover:text-neutral-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 font-semibold text-xs">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // Manejado por div onClick
                                        className="rounded border-white/20 text-red-500 focus:ring-red-500 cursor-pointer"
                                      />
                                      <span className={isChecked ? "text-neutral-100 font-bold" : "text-neutral-300"}>
                                        {permiso.nombre}
                                      </span>
                                    </div>

                                    {permiso.esCritico && (
                                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded flex items-center gap-1" title="Permiso administrativo de alto impacto">
                                        <AlertTriangle className="h-2.5 w-2.5" /> Crítico
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed pl-5">
                                    {permiso.descripcion}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* BARRA INFERIOR FLOTANTE DE CAMBIOS SIN GUARDAR (DIRTY STATE BAR) */}
      <AnimatePresence>
        {hayCambiosSinGuardar && rolSeleccionado && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="bg-neutral-900 border border-red-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 ring-1 ring-red-500/20">
              <div className="flex items-center gap-3 text-xs">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                  <ShieldAlert className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-neutral-100">Tienes cambios sin guardar</p>
                  <p className="text-neutral-400 text-[11px]">
                    Modificaste los permisos para el rol <strong className="text-red-400">{rolSeleccionado.descripcion}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ButtonDS variant="secondary" onClick={handleRevertirCambios} disabled={guardandoPermisos} className="text-xs py-2">
                  Descartar
                </ButtonDS>
                <ButtonDS variant="primary" onClick={handleGuardarPermisosSubmit} disabled={guardandoPermisos} className="text-xs py-2">
                  {guardandoPermisos ? "Guardando..." : "Guardar Cambios"}
                </ButtonDS>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CREAR / EDITAR ROL */}
      <Dialog open={modalRolOpen} onOpenChange={setModalRolOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-red-500" />
              {editandoRol ? `Editar Nombre de Rol` : `Crear Nuevo Rol`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Nombre del Rol *</label>
              <input
                type="text"
                placeholder="ej: Mecánico Senior, Asistente de Recepción..."
                value={nombreRolForm}
                onChange={(e) => setNombreRolForm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 p-2.5 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <ButtonDS variant="secondary" onClick={() => setModalRolOpen(false)} disabled={guardandoRol}>
              Cancelar
            </ButtonDS>
            <ButtonDS variant="primary" onClick={handleGuardarRolModal} disabled={guardandoRol}>
              {guardandoRol ? "Guardando..." : editandoRol ? "Actualizar Rol" : "Crear Rol"}
            </ButtonDS>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL USUARIOS DEL ROL */}
      <Dialog open={modalUsuariosOpen} onOpenChange={setModalUsuariosOpen}>
        <DialogContent className="sm:max-w-lg bg-neutral-900 border-white/10 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="h-5 w-5 text-blue-400" />
              Usuarios con el Rol: <span className="text-red-400">{rolSeleccionado?.descripcion}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto">
            {cargandoUsuarios ? (
              <div className="p-8 text-center text-xs text-neutral-400 animate-pulse">
                Cargando usuarios asignados a este rol...
              </div>
            ) : usuariosDelRol.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 rounded-xl bg-neutral-950 border border-white/5">
                No hay usuarios actualmente asociados a este rol.
              </div>
            ) : (
              <div className="space-y-2">
                {usuariosDelRol.map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-neutral-950 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-neutral-100">{u.nombreCompleto}</p>
                      <p className="text-neutral-500 text-[11px] font-mono">{u.email}</p>
                    </div>
                    <BadgeDS variant={u.estado !== false ? "emerald" : "red"}>
                      {u.estado !== false ? "Activo" : "Inactivo"}
                    </BadgeDS>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <ButtonDS variant="secondary" onClick={() => setModalUsuariosOpen(false)}>
              Cerrar
            </ButtonDS>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR ELIMINACIÓN DE ROL */}
      <Dialog open={modalDeleteConfirmOpen} onOpenChange={setModalDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-white/10 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-400">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación de Rol
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 text-xs space-y-2 text-neutral-300">
            <p>
              ¿Estás seguro de que deseas eliminar permanentemente el rol <strong className="text-neutral-100 font-bold">"{rolAEliminar?.descripcion}"</strong>?
            </p>
            <p className="text-neutral-500">
              Esta acción revocará la matriz de permisos configurada para este rol.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <ButtonDS variant="secondary" onClick={() => setModalDeleteConfirmOpen(false)} disabled={eliminandoRol}>
              Cancelar
            </ButtonDS>
            <ButtonDS variant="danger" onClick={handleConfirmarEliminarRol} disabled={eliminandoRol}>
              {eliminandoRol ? "Eliminando..." : "Sí, Eliminar Rol"}
            </ButtonDS>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionRoles;
