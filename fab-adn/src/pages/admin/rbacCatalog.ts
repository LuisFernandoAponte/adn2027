export interface PermisoMeta {
  permiso: string;
  nombre: string;
  modulo: string;
  descripcion: string;
  esCritico?: boolean;
}

export const MODULOS_SISTEMA = [
  { id: "ot", nombre: "Órdenes de Trabajo (OT)", icono: "Wrench" },
  { id: "citas", nombre: "Citas & Reservas", icono: "Calendar" },
  { id: "clientes", nombre: "Clientes & Propietarios", icono: "User" },
  { id: "vehiculos", nombre: "Vehículos", icono: "Car" },
  { id: "inventario", nombre: "Inventario & Repuestos", icono: "Package" },
  { id: "facturacion", nombre: "Facturación & Pagos", icono: "DollarSign" },
  { id: "usuarios", nombre: "Gestión de Usuarios", icono: "Users" },
  { id: "reportes", nombre: "Reportes & Estadísticas", icono: "BarChart3" },
  { id: "administracion", nombre: "Administración del Sistema", icono: "Shield" },
] as const;

export const CATALOGO_PERMISOS: PermisoMeta[] = [
  // Órdenes de Trabajo
  { permiso: "ver_trabajos", nombre: "Ver trabajos", modulo: "Órdenes de Trabajo (OT)", descripcion: "Permite consultar y buscar las Órdenes de Trabajo (OT) del taller." },
  { permiso: "crear_trabajos", nombre: "Crear trabajos", modulo: "Órdenes de Trabajo (OT)", descripcion: "Permite registrar nuevas Órdenes de Trabajo para clientes y vehículos." },
  { permiso: "editar_trabajos", nombre: "Editar trabajos", modulo: "Órdenes de Trabajo (OT)", descripcion: "Permite actualizar información, servicios y responsables de las OT." },
  { permiso: "cambiar_estado_trabajos", nombre: "Cambiar estado de trabajo", modulo: "Órdenes de Trabajo (OT)", descripcion: "Permite avanzar el flujo operativo (Agendado -> En progreso -> Completado -> Entregado)." },
  { permiso: "eliminar_trabajos", nombre: "Eliminar trabajos", modulo: "Órdenes de Trabajo (OT)", descripcion: "Permite cancelar o archivar lógicamente Órdenes de Trabajo.", esCritico: true },

  // Citas & Reservas
  { permiso: "ver_citas", nombre: "Ver citas", modulo: "Citas & Reservas", descripcion: "Permite visualizar las citas y reservas agendadas en el calendario." },
  { permiso: "agendar_citas", nombre: "Agendar citas", modulo: "Citas & Reservas", descripcion: "Permite registrar nuevas reservaciones de clientes." },
  { permiso: "editar_citas", nombre: "Editar citas", modulo: "Citas & Reservas", descripcion: "Permite reajustar fechas, horarios o tipo de servicio de una cita." },
  { permiso: "cancelar_citas", nombre: "Cancelar citas", modulo: "Citas & Reservas", descripcion: "Permite anular citas agendadas." },

  // Clientes
  { permiso: "ver_clientes", nombre: "Ver clientes", modulo: "Clientes & Propietarios", descripcion: "Permite consultar el directorio de clientes y sus teléfonos." },
  { permiso: "crear_clientes", nombre: "Crear clientes", modulo: "Clientes & Propietarios", descripcion: "Permite dar de alta nuevos propietarios en la base de datos." },
  { permiso: "editar_clientes", nombre: "Editar clientes", modulo: "Clientes & Propietarios", descripcion: "Permite actualizar datos personales o de contacto del cliente." },
  { permiso: "eliminar_clientes", nombre: "Eliminar clientes", modulo: "Clientes & Propietarios", descripcion: "Permite dar de baja o bloquear expedientes de clientes.", esCritico: true },

  // Vehículos
  { permiso: "ver_vehiculos", nombre: "Ver vehículos", modulo: "Vehículos", descripcion: "Permite consultar las fichas de vehículos y su historial técnico." },
  { permiso: "registrar_vehiculos", nombre: "Registrar vehículos", modulo: "Vehículos", descripcion: "Permite dar de alta nuevos vehículos con placa, marca y modelo." },
  { permiso: "editar_vehiculos", nombre: "Editar vehículos", modulo: "Vehículos", descripcion: "Permite modificar kilometraje y ficha técnica del vehículo." },
  { permiso: "eliminar_vehiculos", nombre: "Eliminar vehículos", modulo: "Vehículos", descripcion: "Permite remover vehículos del inventario de clientes.", esCritico: true },

  // Inventario & Repuestos
  { permiso: "ver_inventario", nombre: "Ver inventario", modulo: "Inventario & Repuestos", descripcion: "Permite consultar el stock actual de repuestos e insumos." },
  { permiso: "crear_repuestos", nombre: "Crear repuestos", modulo: "Inventario & Repuestos", descripcion: "Permite ingresar nuevos artículos o productos al almacén." },
  { permiso: "editar_repuestos", nombre: "Editar repuestos", modulo: "Inventario & Repuestos", descripcion: "Permite modificar precios de venta, compra y datos de repuestos." },
  { permiso: "ajustar_stock", nombre: "Ajustar stock", modulo: "Inventario & Repuestos", descripcion: "Permite ingresar o descontar unidades físicas de inventario." },
  { permiso: "eliminar_repuestos", nombre: "Eliminar repuestos", modulo: "Inventario & Repuestos", descripcion: "Permite dar de baja artículos del catálogo de repuestos.", esCritico: true },

  // Facturación & Pagos
  { permiso: "ver_facturas", nombre: "Ver facturas", modulo: "Facturación & Pagos", descripcion: "Permite consultar el libro de facturación y comprobantes emitidos." },
  { permiso: "generar_facturas", nombre: "Generar facturas", modulo: "Facturación & Pagos", descripcion: "Permite emitir facturas legales (IVA 13% / IT 3%) en BOB." },
  { permiso: "registrar_pagos", nombre: "Registrar pagos", modulo: "Facturación & Pagos", descripcion: "Permite asentar pagos recibidos (efectivo, QR, transferencia)." },
  { permiso: "anular_facturas", nombre: "Anular facturas", modulo: "Facturación & Pagos", descripcion: "Permite anular comprobantes fiscales emitidos.", esCritico: true },

  // Gestión de Usuarios
  { permiso: "ver_usuarios", nombre: "Ver usuarios", modulo: "Gestión de Usuarios", descripcion: "Permite visualizar el listado de personal y usuarios de la plataforma." },
  { permiso: "crear_usuarios", nombre: "Crear usuarios", modulo: "Gestión de Usuarios", descripcion: "Permite registrar nuevos empleados o administradores.", esCritico: true },
  { permiso: "editar_usuarios", nombre: "Editar usuarios", modulo: "Gestión de Usuarios", descripcion: "Permite cambiar datos de cuenta o restablecer contraseñas.", esCritico: true },
  { permiso: "desactivar_usuarios", nombre: "Desactivar usuarios", modulo: "Gestión de Usuarios", descripcion: "Permite suspender temporal o permanentemente cuentas de usuario.", esCritico: true },

  // Reportes & Estadísticas
  { permiso: "ver_reportes", nombre: "Ver reportes", modulo: "Reportes & Estadísticas", descripcion: "Permite analizar gráficos de rendimiento, ingresos y rotación." },
  { permiso: "exportar_reportes", nombre: "Exportar reportes", modulo: "Reportes & Estadísticas", descripcion: "Permite descargar balances y reportes en Excel / PDF." },

  // Administración del Sistema
  { permiso: "gestionar_roles", nombre: "Gestionar roles", modulo: "Administración del Sistema", descripcion: "Permite crear, modificar y estructurar la jerarquía de roles.", esCritico: true },
  { permiso: "gestionar_permisos", nombre: "Gestionar permisos", modulo: "Administración del Sistema", descripcion: "Permite definir y asignar la matriz de accesos RBAC.", esCritico: true }
];

export const resolverPermisoMeta = (nombreOriginal: string): PermisoMeta => {
  const norm = nombreOriginal.trim().toLowerCase();

  const encontrado = CATALOGO_PERMISOS.find(
    p => p.permiso.toLowerCase() === norm || p.nombre.toLowerCase() === norm
  );

  if (encontrado) return encontrado;

  // Clasificación heurística por palabras clave si es un permiso personalizado nuevo
  let modulo = "Administración del Sistema";
  let esCritico = false;

  if (norm.includes("trabajo") || norm.includes("ot")) modulo = "Órdenes de Trabajo (OT)";
  else if (norm.includes("cita") || norm.includes("reserva")) modulo = "Citas & Reservas";
  else if (norm.includes("cliente")) modulo = "Clientes & Propietarios";
  else if (norm.includes("vehiculo") || norm.includes("auto")) modulo = "Vehículos";
  else if (norm.includes("inventario") || norm.includes("repuesto") || norm.includes("stock")) modulo = "Inventario & Repuestos";
  else if (norm.includes("factura") || norm.includes("pago")) modulo = "Facturación & Pagos";
  else if (norm.includes("usuario")) { modulo = "Gestión de Usuarios"; esCritico = true; }
  else if (norm.includes("reporte") || norm.includes("estadistica")) modulo = "Reportes & Estadísticas";
  else if (norm.includes("eliminar") || norm.includes("borrar") || norm.includes("admin")) esCritico = true;

  return {
    permiso: nombreOriginal,
    nombre: nombreOriginal,
    modulo,
    descripcion: `Permite ejecutar la acción "${nombreOriginal}" en el sistema.`,
    esCritico
  };
};
