import db from "../config/db.js";

class CitaModel {

  async getAllWithEstado() {

    const [rows] = await db.getPool().query(`
      SELECT 
          c.id,
          c.fecha_cita,
          c.hora_inicio,
          c.hora_fin,
          c.observaciones,
          c.estado,
          u_cliente.nombre_completo AS cliente,
          u_cliente.telefono AS cliente_telefono,
          u_empleado.nombre_completo AS mecanico,
          GROUP_CONCAT(s.descripcion SEPARATOR ', ') AS servicios,
          COALESCE(SUM(s.costo), 0) AS costo_total
      FROM citas c

      JOIN cliente cl ON c.cliente_id = cl.id
      JOIN usuario u_cliente ON cl.usuario_id = u_cliente.id

      JOIN empleado e ON c.empleado_id = e.id
      JOIN usuario u_empleado ON e.usuario_id = u_empleado.id

      LEFT JOIN detalle_servicio ds ON ds.cita_id = c.id
      LEFT JOIN servicios s ON ds.servicio_id = s.id

      GROUP BY c.id, c.fecha_cita, c.hora_inicio, c.hora_fin, c.observaciones,
               c.estado, u_cliente.nombre_completo, u_cliente.telefono,
               u_empleado.nombre_completo

      ORDER BY c.fecha_cita DESC
    `);

    return rows;
  }

  async cambiarEstado(citaId, nuevoEstado, usuarioId) {
    const estadosValidos = ['Agendado', 'En taller', 'En progreso', 'En revisión', 'Completado', 'Entregado'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error('Estado no válido');
    }

    // Obtener estado anterior
    const [cita] = await db.getPool().query(
      'SELECT estado FROM citas WHERE id = ?',
      [citaId]
    );
    if (cita.length === 0) {
      throw new Error('Cita no encontrada');
    }
    const estadoAnterior = cita[0].estado;

    // Actualizar estado en citas
    await db.getPool().query(
      'UPDATE citas SET estado = ? WHERE id = ?',
      [nuevoEstado, citaId]
    );

    // Registrar historial en estado_trabajo
    await db.getPool().query(
      `INSERT INTO estado_trabajo (estado, estado_anterior, fecha_cambio, cita_id, usuario_id)
       VALUES (?, ?, NOW(), ?, ?)`,
      [nuevoEstado, estadoAnterior, citaId, usuarioId]
    );

    return { message: 'Estado actualizado correctamente' };
  }

  async getCitasByEmpleadoUserId(usuarioId) {
    const [rows] = await db.getPool().query(`
      SELECT 
          c.id,
          c.fecha_cita,
          c.hora_inicio,
          c.hora_fin,
          c.observaciones,
          c.estado,
          u_cliente.nombre_completo AS cliente,
          u_cliente.telefono AS cliente_telefono,
          GROUP_CONCAT(s.descripcion SEPARATOR ', ') AS servicios,
          COALESCE(SUM(s.costo), 0) AS costo_total
      FROM citas c

      JOIN empleado e ON c.empleado_id = e.id
      JOIN cliente cl ON c.cliente_id = cl.id
      JOIN usuario u_cliente ON cl.usuario_id = u_cliente.id

      LEFT JOIN detalle_servicio ds ON ds.cita_id = c.id
      LEFT JOIN servicios s ON ds.servicio_id = s.id

      WHERE e.usuario_id = ?

      GROUP BY c.id, c.fecha_cita, c.hora_inicio, c.hora_fin, c.observaciones,
               c.estado, u_cliente.nombre_completo, u_cliente.telefono

      ORDER BY c.fecha_cita DESC
    `, [usuarioId]);

    return rows;
  }

  async cambiarEstadoEmpleado(citaId, nuevoEstado, usuarioId) {
    const estadosPermitidos = ['En progreso', 'Completado'];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error('Solo puedes cambiar a: En progreso o Completado');
    }
    // Verificar que la cita pertenece al empleado
    const [check] = await db.getPool().query(
      `SELECT c.id FROM citas c 
       JOIN empleado e ON c.empleado_id = e.id 
       WHERE c.id = ? AND e.usuario_id = ?`,
      [citaId, usuarioId]
    );
    if (check.length === 0) {
      throw new Error('No tienes permiso para modificar esta cita');
    }

    // Obtener estado anterior
    const [cita] = await db.getPool().query(
      'SELECT estado FROM citas WHERE id = ?',
      [citaId]
    );
    const estadoAnterior = cita[0].estado;

    // Actualizar estado en citas
    await db.getPool().query(
      'UPDATE citas SET estado = ? WHERE id = ?',
      [nuevoEstado, citaId]
    );

    // Registrar historial en estado_trabajo
    await db.getPool().query(
      `INSERT INTO estado_trabajo (estado, estado_anterior, fecha_cambio, cita_id, usuario_id)
       VALUES (?, ?, NOW(), ?, ?)`,
      [nuevoEstado, estadoAnterior, citaId, usuarioId]
    );

    return { message: 'Estado actualizado correctamente' };
  }

  async obtenercitaPorCliente(clienteId)
  {
    const sql = `
      SELECT 
        c.id,
        c.fecha_cita,
        c.hora_inicio,
        c.estado
      FROM citas c
      WHERE c.cliente_id = ?
      ORDER BY c.fecha_cita DESC
    `;

    const [rows] = await db.getPool().query(sql, [clienteId]);

    return rows;
  }

}

export default new CitaModel();