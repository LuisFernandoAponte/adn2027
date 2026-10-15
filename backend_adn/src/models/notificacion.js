import db from "../config/db.js";

class NotificacionModel {

  async createCambioEstado(citaId) {

    const [rows] = await db.getPool().query(
      `SELECT cliente_id FROM citas WHERE id = ?`,
      [citaId]
    );

    const clienteId = rows[0]?.cliente_id;

    if (!clienteId) {
      throw new Error("Cita no encontrada");
    }

    const sql = `
      INSERT INTO notificaciones
      (asunto, tipo, estado_envio, fecha_programada, cliente_id, cita_id)
      VALUES (?, ?, ?, NOW(), ?, ?)
    `;

    await db.getPool().query(sql, [
      "Cambio de estado del trabajo",
      "EMAIL",
      "PENDIENTE",
      clienteId,
      citaId
    ]);
  }

}

export default new NotificacionModel();