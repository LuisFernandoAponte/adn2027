import db from "../config/db.js";

class PermisoModel {

  // Obtener todos los permisos
  async findAll() {
    const [rows] = await db.getPool().query(
      "SELECT id, permiso FROM permisos ORDER BY id ASC"
    );
    return rows;
  }

  // Obtener un permiso por ID
  async findById(id) {
    const [rows] = await db.getPool().query(
      "SELECT id, permiso FROM permisos WHERE id = ?",
      [id]
    );
    return rows[0];
  }

  // Crear un nuevo permiso
  async create(permiso) {
    const [result] = await db.getPool().query(
      "INSERT INTO permisos (permiso) VALUES (?)",
      [permiso]
    );
    return result.insertId;
  }

  // Actualizar un permiso
  async update(id, permiso) {
    const [result] = await db.getPool().query(
      "UPDATE permisos SET permiso = ? WHERE id = ?",
      [permiso, id]
    );
    return result.affectedRows;
  }

  // Eliminar un permiso
  async delete(id) {
    // Primero eliminar de detalle_permiso
    await db.getPool().query(
      "DELETE FROM detalle_permiso WHERE permiso_id = ?",
      [id]
    );
    const [result] = await db.getPool().query(
      "DELETE FROM permisos WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  // Verificar si ya existe un permiso con ese nombre
  async findByNombre(permiso) {
    const [rows] = await db.getPool().query(
      "SELECT id, permiso FROM permisos WHERE permiso = ?",
      [permiso]
    );
    return rows[0];
  }

  // Obtener permisos asignados a un rol
  async getPermisosByRolId(rolId) {
    const [rows] = await db.getPool().query(
      `SELECT p.id, p.permiso 
       FROM permisos p
       INNER JOIN detalle_permiso dp ON dp.permiso_id = p.id
       WHERE dp.rol_id = ?
       ORDER BY p.id ASC`,
      [rolId]
    );
    return rows;
  }

  // Asignar permisos a un rol (reemplaza todos los permisos del rol)
  async asignarPermisosARol(rolId, permisoIds) {
    const conn = await db.getPool().getConnection();
    try {
      await conn.beginTransaction();

      // Eliminar permisos actuales del rol
      await conn.query(
        "DELETE FROM detalle_permiso WHERE rol_id = ?",
        [rolId]
      );

      // Insertar los nuevos permisos
      if (permisoIds && permisoIds.length > 0) {
        const values = permisoIds.map(pid => [rolId, pid]);
        await conn.query(
          "INSERT INTO detalle_permiso (rol_id, permiso_id) VALUES ?",
          [values]
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Obtener permisos de un usuario (por su rol)
  async getPermisosByUsuarioId(usuarioId) {
    const [rows] = await db.getPool().query(
      `SELECT p.id, p.permiso 
       FROM permisos p
       INNER JOIN detalle_permiso dp ON dp.permiso_id = p.id
       INNER JOIN usuario u ON u.rol_id = dp.rol_id
       WHERE u.id = ?
       ORDER BY p.id ASC`,
      [usuarioId]
    );
    return rows;
  }
}

export default new PermisoModel();
