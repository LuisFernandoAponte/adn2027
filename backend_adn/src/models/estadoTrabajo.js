import db from "../config/db.js";

class EstadoTrabajoModel {

  async getUltimoEstado(citaId) {
    const [rows] = await db.getPool().query(
      `SELECT estado
       FROM estado_trabajo
       WHERE cita_id = ?
       ORDER BY fecha_cambio DESC
       LIMIT 1`,
      [citaId]
    );

    return rows[0];
  }

  async create(data) {
    const sql = `
      INSERT INTO estado_trabajo
      (estado, estado_anterior, fecha_cambio, cita_id, usuario_id)
      VALUES (?, ?, NOW(), ?, ?)
    `;

    await db.getPool().query(sql, [
      data.estado,
      data.estadoAnterior,
      data.citaId,
      data.usuarioId
    ]);
  }

  async getHistorial(citaId) {
    const [rows] = await db.getPool().query(
      `SELECT estado, estado_anterior, fecha_cambio
       FROM estado_trabajo
       WHERE cita_id = ?
       ORDER BY fecha_cambio ASC`,
      [citaId]
    );

    return rows;
  }

}

export default new EstadoTrabajoModel();