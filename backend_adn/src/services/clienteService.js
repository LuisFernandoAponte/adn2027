import db from "../config/db.js";
import emailService from "./emailService.js";
import bcrypt from "bcrypt";

class ClienteService {

  async registrarCliente(data) {
    const { nombre_completo, email, telefono, password, direccion, sexo, edad } = data;

    if (!nombre_completo || !email || !password) {
      throw new Error('Nombre, email y contraseña son requeridos');
    }

    const [existing] = await db.getPool().query(
      'SELECT id FROM usuario WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await db.getPool().query(
      `INSERT INTO usuario (nombre_completo, email, telefono, password, direccion, sexo, edad, rol_id, fecha_reg)
       VALUES (?, ?, ?, ?, ?, ?, ?, 3, CURDATE())`,
      [nombre_completo, email, telefono || null, passwordHash, direccion || null, sexo || null, edad || null]
    );

    const usuarioId = userResult.insertId;

    await db.getPool().query(
      'INSERT INTO cliente (usuario_id) VALUES (?)',
      [usuarioId]
    );

    return {
      id: usuarioId,
      message: 'Cliente registrado exitosamente'
    };
  }

  async getEmpleadosDisponibles() {
    const [rows] = await db.getPool().query(`
      SELECT 
        e.id as empleado_id,
        u.nombre_completo,
        e.cargo,
        u.telefono,
        u.email
      FROM empleado e
      JOIN usuario u ON e.usuario_id = u.id
      ORDER BY u.nombre_completo
    `);
    return rows;
  }

  // ✅ CORREGIDO: Soporta múltiples servicios (array id_servicios)
  async agendarCita(data) {
    const { id_cliente, id_empleado, id_servicios, fecha_cita, hora_inicio, observaciones } = data;

    // ✅ Validación mejorada para arrays
    if (!id_cliente || !id_empleado || !Array.isArray(id_servicios) || id_servicios.length === 0 || !fecha_cita || !hora_inicio) {
      throw new Error('Todos los campos son requeridos y se debe seleccionar al menos un servicio');
    }

    // 1️⃣ Validar horario disponible
    const [horarioOcupado] = await db.getPool().query(
      `SELECT id FROM citas 
       WHERE empleado_id = ? 
         AND fecha_cita = ? 
         AND hora_inicio = ?
         AND estado IN ('Agendado', 'En taller', 'En progreso')`,
      [id_empleado, fecha_cita, hora_inicio]
    );

    if (horarioOcupado.length > 0) {
      const error = new Error('El horario seleccionado ya está ocupado');
      error.statusCode = 409;
      throw error;
    }

    // 2️⃣ ✅ Obtener TODOS los servicios seleccionados
    const [serviciosList] = await db.getPool().query(
      'SELECT id, duracion_estimada, costo, descripcion FROM servicios WHERE id IN (?)',
      [id_servicios]
    );

    if (serviciosList.length === 0) {
      throw new Error('No se encontraron servicios válidos');
    }

    // 3️⃣ ✅ Calcular hora_fin sumando duración de TODOS los servicios
    let totalMinutos = 0;
    serviciosList.forEach(servicio => {
      let duracion = servicio.duracion_estimada;
      if (typeof duracion === 'string') {
        // Extraer número de strings como "60 minutos" o "1.5 horas"
        const match = duracion.match(/(\d+\.?\d*)/);
        if (match) {
          const valor = parseFloat(match[1]);
          // Si la cadena contiene "hora", convertir a minutos
          if (duracion.toLowerCase().includes('hora')) {
            totalMinutos += valor * 60;
          } else {
            totalMinutos += valor;
          }
        } else {
          totalMinutos += 60; // valor por defecto: 1 hora
        }
      } else {
        totalMinutos += parseInt(duracion) || 60;
      }
    });

    // Calcular hora_fin
    const [hora, minuto] = hora_inicio.split(':').map(Number);
    const horaFinDate = new Date();
    horaFinDate.setHours(hora, minuto + totalMinutos, 0, 0);
    const hora_fin = horaFinDate.toTimeString().substring(0, 8);

    // 4️⃣ Insertar cita
    const [result] = await db.getPool().query(
      `INSERT INTO citas (cliente_id, empleado_id, fecha_cita, hora_inicio, hora_fin, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, 'Agendado', ?)`,
      [id_cliente, id_empleado, fecha_cita, hora_inicio, hora_fin, observaciones || null]
    );

    const id_cita = result.insertId;

    // 5️⃣ ✅ Insertar MÚLTIPLES detalles de servicio (bulk insert)
    const detalleValues = serviciosList.map(servicio => [id_cita, servicio.id]);
    await db.getPool().query(
      'INSERT INTO detalle_servicio (cita_id, servicio_id) VALUES ?',
      [detalleValues]
    );

    // 6️⃣ Enviar email de confirmación
    try {
      const [clienteData] = await db.getPool().query(
        `SELECT u.nombre_completo, u.email 
         FROM cliente c 
         JOIN usuario u ON c.usuario_id = u.id 
         WHERE c.id = ?`,
        [id_cliente]
      );

      const [empleadoData] = await db.getPool().query(
        `SELECT u.nombre_completo 
         FROM empleado e 
         JOIN usuario u ON e.usuario_id = u.id 
         WHERE e.id = ?`,
        [id_empleado]
      );

      if (clienteData[0]?.email) {
        // Calcular costo total
        const costoTotal = serviciosList.reduce((acc, servicio) => {
          let costo = servicio.costo;
          if (typeof costo === 'string') {
            costo = parseFloat(costo.replace(/[^0-9.]/g, '')) || 0;
          }
          return acc + (costo || 0);
        }, 0);

        emailService.sendAppointmentConfirmation(
          clienteData[0].email,
          {
            clienteNombre: clienteData[0]?.nombre_completo || 'Estimado cliente',
            empleadoNombre: empleadoData[0]?.nombre_completo || 'Mecánico asignado',
            servicios: serviciosList.map(s => ({ 
              descripcion: s.descripcion, 
              costo: s.costo 
            })),
            fechaCita: fecha_cita,
            horaInicio: hora_inicio,
            horaFin: hora_fin,
            observaciones: observaciones || '',
            costoTotal: costoTotal.toFixed(2)
          }
        ).catch(err => console.error('❌ Error enviando email:', err));
      }
    } catch (emailError) {
      console.error('⚠️ Error en envío de email (no bloquea la cita):', emailError);
    }

    return { id_cita, message: 'Cita agendada exitosamente' };
  }

  async buscarClientesPorNombre(nombre) {
  const [clientes] = await db.getPool().query(
    `
    SELECT 
        c.id,
        u.nombre_completo AS nombre,
        u.email
    FROM cliente c
    INNER JOIN usuario u ON c.usuario_id = u.id
    WHERE u.nombre_completo LIKE ?
    ORDER BY u.nombre_completo ASC
    `,
    [`%${nombre}%`]
  );

  return clientes;
}

  async obtenerCitasPorCliente(clienteId) {
  const [citas] = await db.getPool().query(
    `
    SELECT 
        c.id,
        c.fecha_cita,
        c.hora_inicio,
        c.hora_fin,
        c.observaciones,
        et.estado
    FROM citas c
    LEFT JOIN estado_trabajo et 
        ON et.cita_id = c.id
    WHERE c.cliente_id = ?
    ORDER BY c.fecha_cita DESC
    `,
    [clienteId]
  );

  return citas;
}
}

export default new ClienteService();