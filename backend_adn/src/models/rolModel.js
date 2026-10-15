import db from "../config/db.js";

class RolModel {

  // Obtener todos los roles
  async findAll() {
    const [rows] = await db.getPool().query(
      "SELECT id, descripcion FROM rol ORDER BY id ASC"
    );
    return rows;
  }

  // Obtener un rol por ID
  async findById(id) {
    const [rows] = await db.getPool().query(
      "SELECT id, descripcion FROM rol WHERE id = ?",
      [id]
    );
    return rows[0];
  }

  // Crear un nuevo rol
  async create(descripcion) {
    const [result] = await db.getPool().query(
      "INSERT INTO rol (descripcion) VALUES (?)",
      [descripcion]
    );
    return result.insertId;
  }

  // Actualizar un rol
  async update(id, descripcion) {
    const [result] = await db.getPool().query(
      "UPDATE rol SET descripcion = ? WHERE id = ?",
      [descripcion, id]
    );
    return result.affectedRows;
  }

  // Eliminar un rol (solo si no tiene usuarios asignados)
  async delete(id) {
    const [result] = await db.getPool().query(
      "DELETE FROM rol WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  // Verificar si un rol tiene usuarios asignados
  async hasUsers(id) {
    const [rows] = await db.getPool().query(
      "SELECT COUNT(*) as total FROM usuario WHERE rol_id = ?",
      [id]
    );
    return rows[0].total > 0;
  }

  // Verificar si ya existe un rol con esa descripción
  async findByDescripcion(descripcion) {
    const [rows] = await db.getPool().query(
      "SELECT id, descripcion FROM rol WHERE descripcion = ?",
      [descripcion]
    );
    return rows[0];
  }
}

export default new RolModel();
