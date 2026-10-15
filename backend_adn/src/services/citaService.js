import CitaModel from "../models/citaModel.js";
import db from "../config/db.js";

class CitaService {

  async obtenerCitasAdmin() {
    return await CitaModel.getAllWithEstado();
  }

  async cambiarEstado(citaId, nuevoEstado, usuarioId) {
    return await CitaModel.cambiarEstado(citaId, nuevoEstado, usuarioId);
  }

  async obtenerCitasEmpleado(usuarioId) {
    return await CitaModel.getCitasByEmpleadoUserId(usuarioId);
  }

  async cambiarEstadoEmpleado(citaId, nuevoEstado, usuarioId) {
    return await CitaModel.cambiarEstadoEmpleado(citaId, nuevoEstado, usuarioId);
  }

  async obtenerCitasCliente(usuarioId) {

    // Buscar cliente_id desde usuario_id
    const [cliente] = await db.getPool().query(
      "SELECT id FROM cliente WHERE usuario_id = ?",
      [usuarioId]
    );

    if (!cliente.length) {
      throw new Error("Cliente no encontrado");
    }

    const clienteId = cliente[0].id;

    return await CitaModel.obtenercitaPorCliente(clienteId);
  }

}



export default new CitaService();