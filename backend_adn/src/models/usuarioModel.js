//modelo usuario

import db from "../config/db.js";

class UsuarioModel {

  async findById(id) {
    const [rows] = await db.getPool().query(
      `SELECT u.id, u.nombre_completo, u.email, u.telefono, u.direccion, u.sexo, u.estado, u.fecha_reg, u.rol_id,
              r.descripcion AS rol
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  }

  async findByEmail(email) {
    const [rows] = await db.getPool().query(
      "SELECT * FROM usuario WHERE email = ?",
      [email]
    );
    return rows[0];
  }

  async create(data) {
    const sql = `
      INSERT INTO usuario 
      (nombre_completo, email, password, telefono, direccion, sexo, edad, estado, fecha_reg, rol_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURDATE(), ?)
    `;

    const [result] = await db.getPool().query(sql, [
      data.nombre_completo,
      data.email,
      data.password,
      data.telefono || null,
      data.direccion || null,
      data.sexo || null,
      data.edad || null,
      data.rol_id
    ]);

    return result.insertId;
  }

  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.nombre_completo !== undefined) { fields.push("nombre_completo = ?"); values.push(data.nombre_completo); }
    if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
    if (data.password !== undefined) { fields.push("password = ?"); values.push(data.password); }
    if (data.telefono !== undefined) { fields.push("telefono = ?"); values.push(data.telefono); }
    if (data.direccion !== undefined) { fields.push("direccion = ?"); values.push(data.direccion); }
    if (data.sexo !== undefined) { fields.push("sexo = ?"); values.push(data.sexo); }
    if (data.rol_id !== undefined) { fields.push("rol_id = ?"); values.push(data.rol_id); }
    if (data.estado !== undefined) { fields.push("estado = ?"); values.push(data.estado); }

    if (fields.length === 0) throw new Error("No hay campos para actualizar");

    values.push(id);
    const sql = `UPDATE usuario SET ${fields.join(", ")} WHERE id = ?`;
    const [result] = await db.getPool().query(sql, values);
    return result.affectedRows;
  }

  async deleteLogical(id) {
    const [result] = await db.getPool().query(
      "UPDATE usuario SET estado = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  async activar(id) {
    const [result] = await db.getPool().query(
      "UPDATE usuario SET estado = 1 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  async createEmpleado(usuarioId, cargo) {
    const sql = `INSERT INTO empleado (cargo, usuario_id) VALUES (?, ?)`;
    const [result] = await db.getPool().query(sql, [cargo, usuarioId]);
    return result.insertId;
  }

  async updateEmpleadoCargo(usuarioId, cargo) {
    const sql = `UPDATE empleado SET cargo = ? WHERE usuario_id = ?`;
    const [result] = await db.getPool().query(sql, [cargo, usuarioId]);
    return result.affectedRows;
  }

  async getEmpleadoByUsuarioId(usuarioId) {
    const [rows] = await db.getPool().query(
      "SELECT * FROM empleado WHERE usuario_id = ?",
      [usuarioId]
    );
    return rows[0];
  }

  async deleteEmpleado(usuarioId) {
    const [result] = await db.getPool().query(
      "DELETE FROM empleado WHERE usuario_id = ?",
      [usuarioId]
    );
    return result.affectedRows;
  }

  async findAll() {
    const [rows] = await db.getPool().query(
      `SELECT u.id, u.nombre_completo, u.email, u.telefono, u.direccion, u.sexo, u.estado, u.fecha_reg, u.rol_id,
              r.descripcion AS rol,
              e.cargo
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       LEFT JOIN empleado e ON e.usuario_id = u.id
       ORDER BY u.id DESC`
    );
    return rows;
  }

  async getRolById(usuarioId) {
    const [rows] = await db.getPool().query(
      `SELECT r.descripcion FROM usuario u 
       JOIN rol r ON u.rol_id = r.id 
       WHERE u.id = ?`,
      [usuarioId]
    );
    return rows[0]?.descripcion || null;
  }

  // ── Intentos de login ──

  async incrementarIntentos(userId) {
    await db.getPool().query(
      "UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?",
      [userId]
    );
  }

  async resetearIntentos(userId) {
    await db.getPool().query(
      "UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
      [userId]
    );
  }

  async bloquearUsuario(userId, minutos = 5) {
    await db.getPool().query(
      "UPDATE usuario SET bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
      [minutos, userId]
    );
  }

  async obtenerEstadoBloqueo(userId) {
    const [rows] = await db.getPool().query(
      "SELECT intentos_fallidos, bloqueado_hasta FROM usuario WHERE id = ?",
      [userId]
    );
    return rows[0];
  }

}

export default new UsuarioModel();