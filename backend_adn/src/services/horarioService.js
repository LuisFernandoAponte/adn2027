import HorarioModel from "../models/horarioModel.js";

class HorarioService {
  
  async getHorariosDisponibles(empleadoId, fecha, tipoServicio) {
    if (!empleadoId || !fecha || !tipoServicio) {
      throw new Error("Empleado, fecha y tipo de servicio son requeridos");
    }

    if (!['revision', 'reparacion'].includes(tipoServicio)) {
      throw new Error("Tipo de servicio inválido");
    }

    const horarios = await HorarioModel.getHorariosByFecha(
      empleadoId,
      fecha,
      tipoServicio
    );

    return horarios.map(h => ({
      id: h.id,
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      estado: h.estado,
      tipo_servicio: h.tipo_servicio
    }));
  }

  // ✅ NUEVO: Obtener días disponibles del mes
  async getDiasDisponibles(empleadoId, tipoServicio, mes, anio) {
    if (!empleadoId || !tipoServicio || !mes || !anio) {
      throw new Error("Empleado, tipo de servicio, mes y año son requeridos");
    }

    return await HorarioModel.getDiasDisponibles(
      empleadoId,
      tipoServicio,
      parseInt(mes),
      parseInt(anio)
    );
  }
}

export default new HorarioService();