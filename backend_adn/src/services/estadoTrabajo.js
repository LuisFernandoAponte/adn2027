import EstadoTrabajoModel from "../models/estadoTrabajo.js";
import UsuarioModel from "../models/usuarioModel.js";
import NotificacionModel from "../models/notificacion.js";

class EstadoTrabajoService {

  flujoEstados = [
    "Agendado",
    "En taller",
    "En progreso",
    "En revisión",
    "Completado",
    "Entregado"
  ];

  async cambiarEstado(citaId, nuevoEstado, usuarioId) {

    // 1️⃣ Validar rol
    const rol = await UsuarioModel.getRolById(usuarioId);

    if (!rol) {
      throw new Error("Usuario no válido");
    }

    // 2️⃣ Obtener estado actual
    const ultimoEstado = await EstadoTrabajoModel.getUltimoEstado(citaId);
    const estadoActual = ultimoEstado?.estado || "Agendado";

    const indexActual = this.flujoEstados.indexOf(estadoActual);
    const indexNuevo = this.flujoEstados.indexOf(nuevoEstado);

    // 3️⃣ Validar flujo consecutivo
    if (indexNuevo !== indexActual + 1) {
      throw new Error("No se puede saltar estados");
    }

    // 4️⃣ Validar permisos por rol
    if (rol === "Mecanico") {
      if (!["En progreso", "Completado"].includes(nuevoEstado)) {
        throw new Error("No tiene permisos para este cambio");
      }
    }

    // 5️⃣ Registrar historial
    await EstadoTrabajoModel.create({
      estado: nuevoEstado,
      estadoAnterior: estadoActual,
      citaId,
      usuarioId
    });

    // 6️⃣ Crear notificación (excepto En progreso)
    if (nuevoEstado !== "En progreso") {
      await NotificacionModel.createCambioEstado(citaId);
    }

    return {
      message: "Estado actualizado correctamente"
    };
  }

  async obtenerHistorial(citaId) {
    return await EstadoTrabajoModel.getHistorial(citaId);
  }

}

export default new EstadoTrabajoService();