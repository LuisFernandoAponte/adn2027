import db from "../config/db.js";

class DashboardService {

  async getStats() {
    const pool = db.getPool();

    // Total ingresos (facturas emitidas)
    const [ingresosResult] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS totalIngresos 
       FROM factura 
       WHERE estado = 'emitida'`
    );

    // Conteo de citas por estado
    const [citasCounts] = await pool.query(
      `SELECT 
         COUNT(*) AS totalCitas,
         SUM(CASE WHEN estado IN ('Completado','Entregado') THEN 1 ELSE 0 END) AS completados,
         SUM(CASE WHEN estado IN ('En taller','En progreso','En revisión') THEN 1 ELSE 0 END) AS enProceso,
         SUM(CASE WHEN estado = 'Agendado' THEN 1 ELSE 0 END) AS pendientes
       FROM citas`
    );

    // Mecánico top del mes (más citas completadas/entregadas)
    const [topMecanico] = await pool.query(
      `SELECT u.nombre_completo, COUNT(*) AS total_trabajos
       FROM citas c
       JOIN empleado e ON c.empleado_id = e.id
       JOIN usuario u ON e.usuario_id = u.id
       WHERE c.estado IN ('Completado','Entregado')
         AND MONTH(c.fecha_cita) = MONTH(CURDATE())
         AND YEAR(c.fecha_cita) = YEAR(CURDATE())
       GROUP BY e.id, u.nombre_completo
       ORDER BY total_trabajos DESC
       LIMIT 1`
    );

    // Total clientes registrados
    const [clientesResult] = await pool.query(
      `SELECT COUNT(*) AS totalClientes FROM cliente`
    );

    return {
      totalIngresos: parseFloat(ingresosResult[0].totalIngresos),
      totalCitas: citasCounts[0].totalCitas,
      completados: parseInt(citasCounts[0].completados),
      enProceso: parseInt(citasCounts[0].enProceso),
      pendientes: parseInt(citasCounts[0].pendientes),
      totalClientes: clientesResult[0].totalClientes,
      topMecanico: topMecanico.length > 0
        ? { nombre: topMecanico[0].nombre_completo, trabajos: topMecanico[0].total_trabajos }
        : null
    };
  }

  async getRecentServices() {
    const pool = db.getPool();

    const [rows] = await pool.query(
      `SELECT 
         c.id,
         c.fecha_cita,
         c.estado,
         u_cli.nombre_completo AS cliente,
         u_emp.nombre_completo AS mecanico,
         GROUP_CONCAT(s.descripcion SEPARATOR ', ') AS servicios,
         COALESCE(SUM(s.costo), 0) AS costo_total
       FROM citas c
       JOIN cliente cli ON c.cliente_id = cli.id
       JOIN usuario u_cli ON cli.usuario_id = u_cli.id
       JOIN empleado emp ON c.empleado_id = emp.id
       JOIN usuario u_emp ON emp.usuario_id = u_emp.id
       LEFT JOIN detalle_servicio ds ON ds.cita_id = c.id
       LEFT JOIN servicios s ON ds.servicio_id = s.id
       GROUP BY c.id, c.fecha_cita, c.estado, u_cli.nombre_completo, u_emp.nombre_completo
       ORDER BY c.fecha_cita DESC
       LIMIT 10`
    );

    return rows;
  }
}

export default new DashboardService();
