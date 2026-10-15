// src/services/servicioService.js
import db from "../config/db.js";

class ServicioService {
  async getAll() {
    const sql = `
      SELECT 
        id,
        categoria,
        descripcion,
        costo,
        duracion_estimada,
        estado
      FROM servicios
      WHERE estado = 'Activo' OR estado = 1
      ORDER BY categoria, descripcion
    `;
    const [rows] = await db.query(sql);
    return rows;
  }
}

export default new ServicioService();