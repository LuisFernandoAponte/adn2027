import db from "../config/db.js";

class HorarioModel {
  
  // Obtener horarios para una fecha específica
  static async getHorariosByFecha(empleadoId, fecha, tipoServicio) {
    const date = new Date(fecha + 'T00:00:00');
    let diaSemana = date.getDay();
    diaSemana = diaSemana === 0 ? 7 : diaSemana; // Domingo: 0 → 7

    const query = `
      SELECT 
        h.id,
        h.hora_inicio,
        h.hora_fin,
        h.tipo_servicio,
        c.id as cita_id,
        CASE 
          WHEN c.id IS NOT NULL THEN 'ocupado'
          ELSE 'disponible'
        END as estado
      FROM horarios_empleado h
      LEFT JOIN citas c ON c.empleado_id = h.empleado_id 
        AND c.fecha_cita = ?
        AND c.hora_inicio = h.hora_inicio
        AND c.estado IN ('Agendado', 'En taller', 'En progreso')
      WHERE h.empleado_id = ?
        AND h.dia_semana = ?
        AND h.tipo_servicio IN (?, 'ambos')
        AND h.activo = 1
      ORDER BY h.hora_inicio
    `;
    
    const [rows] = await db.getPool().execute(query, [
      fecha,
      empleadoId,
      diaSemana,
      tipoServicio
    ]);
    
    return rows;
  }

  // ✅ NUEVO: Obtener días disponibles del mes para un empleado y tipo de servicio
  static async getDiasDisponibles(empleadoId, tipoServicio, mes, anio) {
    // Obtener los días de la semana configurados para este empleado
    const queryDias = `
      SELECT DISTINCT dia_semana
      FROM horarios_empleado
      WHERE empleado_id = ?
        AND activo = 1
        AND (tipo_servicio = ? OR tipo_servicio = 'ambos')
      ORDER BY dia_semana
    `;
    
    const [rowsDias] = await db.getPool().execute(queryDias, [
      empleadoId,
      tipoServicio
    ]);
    
    const diasConfigurados = rowsDias.map(r => r.dia_semana); // [1,2,3,4,5] = Lun-Vie
    
    if (diasConfigurados.length === 0) return [];

    // Generar todos los días del mes solicitado
    const diasDisponibles = [];
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);
    
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fechaActual = new Date(anio, mes - 1, dia);
      let diaSemana = fechaActual.getDay();
      diaSemana = diaSemana === 0 ? 7 : diaSemana;
      
      // Verificar si este día de la semana está configurado
      if (diasConfigurados.includes(diaSemana)) {
        // Verificar que no sea una fecha pasada (si es el mes actual)
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        
        if (fechaActual >= hoy) {
          diasDisponibles.push({
            fecha: fechaActual.toISOString().split('T')[0], // "2026-03-03"
            dia_semana: diaSemana,
            nombre_dia: this.getNombreDia(diaSemana),
            dia_numero: dia
          });
        }
      }
    }
    
    return diasDisponibles;
  }

  // Helper: Nombre del día en español
  static getNombreDia(diaSemana) {
    const dias = {
      1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue',
      5: 'Vie', 6: 'Sáb', 7: 'Dom'
    };
    return dias[diaSemana] || '';
  }
}

export default HorarioModel;