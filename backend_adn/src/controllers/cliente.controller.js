import prisma from '../config/database.js';
import emailService from '../services/emailService.js';

const TIPO_SERVICIO_MAP = {
  mantenimiento: 'revision',
  diagnostico: 'revision',
  reparacion: 'reparacion',
  electricidad: 'reparacion',
  alineacion: 'revision',
  frenos: 'revision',
  cambio_aceite: 'revision',
  otro: 'revision'
};

export const getEmpleadosDisponibles = async (req, res) => {
  try {
    const empleados = await prisma.empleado.findMany({
      where: {
        estado: true,
        OR: [
          { cargo: { contains: 'Mecánic', mode: 'insensitive' } },
          { cargo: { contains: 'Técnic', mode: 'insensitive' } },
          { cargo: { contains: 'Jefe', mode: 'insensitive' } }
        ]
      },
      include: {
        usuario: {
          select: { id: true, nombreCompleto: true, telefono: true, email: true }
        }
      }
    });

    const resultado = empleados.map(emp => ({
      empleado_id: emp.id,
      nombre_completo: emp.usuario.nombreCompleto,
      cargo: emp.cargo,
      telefono: emp.usuario.telefono,
      email: emp.usuario.email
    }));

    return res.json({ success: true, empleados: resultado });

  } catch (error) {
    console.error('Error getEmpleadosDisponibles:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener empleados' });
  }
};

const SLOTS_POR_DEFECTO = [
  '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00'
];

export const getHorariosDisponibles = async (req, res) => {
  try {
    const { empleado_id, fecha, tipo_servicio } = req.query;

    if (!empleado_id || !fecha || !tipo_servicio) {
      return res.status(400).json({
        success: false,
        error: 'empleado_id, fecha y tipo_servicio son requeridos'
      });
    }

    const backendTipo = TIPO_SERVICIO_MAP[tipo_servicio] || 'revision';
    const [year, month, day] = fecha.split('-').map(Number);
    const fechaDate = new Date(year, month - 1, day);
    const diaSemana = fechaDate.getDay() === 0 ? 7 : fechaDate.getDay();

    const esFinDeSemana = diaSemana === 6 || diaSemana === 7;
    if (esFinDeSemana) {
      return res.json({ success: true, horarios: [] });
    }

    let horariosConfig = await prisma.horariosEmpleado.findMany({
      where: {
        empleadoId: empleado_id,
        diaSemana: diaSemana,
        activo: true,
        OR: [
          { tipoServicio: backendTipo },
          { tipoServicio: 'ambos' }
        ]
      },
      orderBy: { horaInicio: 'asc' }
    });

    if (horariosConfig.length === 0) {
      horariosConfig = SLOTS_POR_DEFECTO.map(h => ({
        id: `default-${h.replace(':', '')}`,
        horaInicio: h,
        horaFin: String(parseInt(h) + 1).padStart(2, '0') + ':00',
        tipoServicio: 'ambos'
      }));
    }

    const citasExistentes = await prisma.cita.findMany({
      where: {
        empleadoId: empleado_id,
        fechaCita: new Date(fecha + 'T00:00:00'),
        estado: { notIn: ['Cancelado', 'Entregado'] }
      },
      select: { horaInicio: true, horaFin: true }
    });

    const horasOcupadas = new Set();
    for (const c of citasExistentes) {
      const inicio = c.horaInicio;
      const fin = c.horaFin;
      const inicioStr = typeof inicio === 'string' ? inicio : inicio.toISOString().split('T')[1]?.substring(0, 8) || '';
      const finStr = typeof fin === 'string' ? fin : fin?.toISOString().split('T')[1]?.substring(0, 8) || '';

      let actual = inicioStr;
      while (actual < finStr) {
        horasOcupadas.add(actual);
        const [hInt, mInt] = actual.split(':').map(Number);
        const totalMin = hInt * 60 + mInt + 60;
        const nH = Math.floor(totalMin / 60).toString().padStart(2, '0');
        const nM = (totalMin % 60).toString().padStart(2, '0');
        actual = `${nH}:${nM}:00`;
      }
    }

    const horarios = [];
    for (const h of horariosConfig) {
      const inicio = typeof h.horaInicio === 'string' ? h.horaInicio : h.horaInicio.toISOString().split('T')[1]?.substring(0, 8) || h.horaInicio;
      const fin = typeof h.horaFin === 'string' ? h.horaFin : h.horaFin.toISOString().split('T')[1]?.substring(0, 8) || h.horaFin;

      let actual = inicio;
      while (actual < fin) {
        const horaPart = actual.substring(0, 5);
        horarios.push({
          id: `${h.id}-${horaPart.replace(':', '')}`,
          hora_inicio: actual,
          hora_fin: horaPart + ':59',
          estado: horasOcupadas.has(actual) ? 'ocupado' : 'disponible',
          tipo_servicio: h.tipoServicio
        });

        const [hInt, mInt] = actual.split(':').map(Number);
        const totalMinutos = hInt * 60 + mInt + 60;
        const nuevaH = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
        const nuevoM = (totalMinutos % 60).toString().padStart(2, '0');
        actual = `${nuevaH}:${nuevoM}:00`;
      }
    }

    return res.json({ success: true, horarios });

  } catch (error) {
    console.error('Error getHorariosDisponibles:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener horarios' });
  }
};

export const getDiasDisponibles = async (req, res) => {
  try {
    const { empleado_id } = req.query;

    if (!empleado_id) {
      return res.status(400).json({ success: false, error: 'empleado_id es requerido' });
    }

    const diasLaborales = await prisma.horariosEmpleado.findMany({
      where: { empleadoId: empleado_id, activo: true },
      distinct: ['diaSemana'],
      select: { diaSemana: true }
    });

    const dias = diasLaborales.map(d => d.diaSemana);

    return res.json({ success: true, dias });

  } catch (error) {
    console.error('Error getDiasDisponibles:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener días disponibles' });
  }
};

export const agendarCita = async (req, res) => {
  try {
    const { id_empleado, id_servicios, fecha_cita, hora_inicio, tipo_servicio } = req.body;
    const clienteId = req.user.id;

    if (!id_empleado || !id_servicios || !id_servicios.length || !fecha_cita || !hora_inicio) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    let cliente = await prisma.cliente.findUnique({
      where: { usuarioId: clienteId },
      include: { usuario: true }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { usuarioId: clienteId },
        include: { usuario: true }
      });
    }

    const horaNormalizada = hora_inicio.includes(':') && hora_inicio.length <= 5
      ? `${hora_inicio}:00`
      : hora_inicio;

    const [h, m] = horaNormalizada.split(':').map(Number);
    const finH = Math.min(h + 1, 23).toString().padStart(2, '0');
    const finStr = `${finH}:${m.toString().padStart(2, '0')}:00`;

    const cita = await prisma.cita.create({
      data: {
        fechaCita: new Date(fecha_cita + 'T00:00:00'),
        horaInicio: new Date('1970-01-01T' + horaNormalizada),
        horaFin: new Date('1970-01-01T' + finStr),
        clienteId: cliente.id,
        empleadoId: id_empleado,
        tipoServicio: tipo_servicio || 'revision',
        estado: 'Agendado',
        detalleServicios: {
          create: id_servicios.map(servId => ({
            servicioId: String(servId)
          }))
        }
      },
      include: {
        detalleServicios: { include: { servicio: true } },
        empleado: { include: { usuario: true } }
      }
    });

    // Enviar correo de confirmación de forma no bloqueante
    try {
      const emailDestino = cliente.usuario?.email;
      if (emailDestino) {
        const fechaFormateada = new Date(fecha_cita + 'T00:00:00').toLocaleDateString('es-BO', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const serviciosList = cita.detalleServicios.map(ds => ({
          descripcion: ds.servicio.descripcion,
          costo: ds.servicio.costo
        }));
        const costoTotal = cita.detalleServicios.reduce((acc, ds) => acc + (parseFloat(ds.servicio.costo) || 0), 0);

        emailService.sendAppointmentConfirmation(emailDestino, {
          clienteNombre: cliente.usuario.nombreCompleto || 'Cliente',
          fechaFormateada,
          horaInicio: horaNormalizada.substring(0, 5),
          horaFin: finStr.substring(0, 5),
          empleadoNombre: cita.empleado?.usuario?.nombreCompleto || 'Mecánico asignado',
          serviciosList,
          costoTotal,
          observaciones: 'Por favor llegar 10 minutos antes.'
        }).catch(err => console.warn('⚠️ No se pudo enviar email de confirmación:', err.message));
      }
    } catch (emailErr) {
      console.warn('⚠️ Error en despacho de email:', emailErr.message);
    }

    return res.json({
      success: true,
      message: 'Cita agendada exitosamente',
      cita: {
        id: cita.id,
        fecha_cita: cita.fechaCita,
        hora_inicio: cita.horaInicio,
        estado: cita.estado
      }
    });

  } catch (error) {
    console.error('Error agendarCita:', error);
    return res.status(500).json({ success: false, error: 'Error al agendar la cita' });
  }
};

export const buscarClientes = async (req, res) => {
  try {
    const { nombre } = req.query;

    const clientes = await prisma.usuario.findMany({
      where: {
        nombreCompleto: { contains: nombre || '', mode: 'insensitive' },
        cliente: { isNot: null }
      },
      include: { cliente: true },
      take: 20
    });

    const resultado = clientes.map(c => ({
      id: c.cliente?.id,
      nombre_completo: c.nombreCompleto,
      telefono: c.telefono,
      email: c.email
    }));

    return res.json({ success: true, clientes: resultado });

  } catch (error) {
    console.error('Error buscarClientes:', error);
    return res.status(500).json({ success: false, error: 'Error al buscar clientes' });
  }
};

export const obtenerCitasPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const citas = await prisma.cita.findMany({
      where: { clienteId },
      include: {
        empleado: {
          include: { usuario: { select: { nombreCompleto: true } } }
        },
        detalleServicios: {
          include: { servicio: true }
        }
      },
      orderBy: { fechaCita: 'desc' }
    });

    const resultado = citas.map(c => ({
      id: c.id,
      fecha_cita: c.fechaCita,
      hora_inicio: c.horaInicio,
      hora_fin: c.horaFin,
      estado: c.estado,
      observaciones: c.observaciones,
      mecanico: c.empleado.usuario.nombreCompleto,
      servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
      costo_total: c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0)
    }));

    return res.json({ success: true, citas: resultado });

  } catch (error) {
    console.error('Error obtenerCitasPorCliente:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener citas' });
  }
};

export const getMisVehiculos = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId }
    });

    if (!cliente) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const vehiculos = await prisma.vehiculo.findMany({
      where: { clienteId: cliente.id, estado: true },
      orderBy: { fechaReg: 'desc' }
    });

    return res.json({ success: true, vehiculos });

  } catch (error) {
    console.error('Error getMisVehiculos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener vehículos' });
  }
};

export const agregarVehiculo = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { marca, modelo, anio, placa } = req.body;

    if (!marca || !placa) {
      return res.status(400).json({ success: false, error: 'Marca y Placa son obligatorios' });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId }
    });

    if (!cliente) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const existePlaca = await prisma.vehiculo.findUnique({
      where: { placa: placa.toUpperCase().trim() }
    });

    if (existePlaca) {
      return res.status(400).json({ success: false, error: 'Ya existe un vehículo registrado con esta placa' });
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        marca: marca.trim(),
        modelo: modelo ? modelo.trim() : null,
        anio: anio ? parseInt(anio) : null,
        placa: placa.toUpperCase().trim(),
        clienteId: cliente.id
      }
    });

    return res.json({ success: true, message: 'Vehículo registrado con éxito', vehiculo });

  } catch (error) {
    console.error('Error agregarVehiculo:', error);
    return res.status(500).json({ success: false, error: 'Error al agregar vehículo' });
  }
};

export const eliminarVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehiculo.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Vehículo eliminado con éxito' });
  } catch (error) {
    console.error('Error eliminarVehiculo:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar vehículo' });
  }
};

export const solicitarAuxilioMecanico = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { tipoEmergencia, ubicacion, vehiculoPlaca, telefonoContacto } = req.body;

    if (!tipoEmergencia || !ubicacion) {
      return res.status(400).json({ success: false, error: 'El tipo de emergencia y ubicación son obligatorios' });
    }

    let cliente = await prisma.cliente.findUnique({
      where: { usuarioId },
      include: { usuario: true }
    });

    if (!cliente) {
      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      cliente = await prisma.cliente.create({
        data: { usuarioId: usuario.id },
        include: { usuario: true }
      });
    }

    let primerEmpleado = await prisma.empleado.findFirst({
      where: { estado: true }
    });

    if (!primerEmpleado) {
      primerEmpleado = await prisma.empleado.findFirst();
    }

    let citaAuxilio = null;
    if (primerEmpleado) {
      citaAuxilio = await prisma.cita.create({
        data: {
          fechaCita: new Date(),
          horaInicio: new Date(),
          clienteId: cliente.id,
          empleadoId: primerEmpleado.id,
          tipoServicio: 'reparacion',
          estado: 'En taller',
          observaciones: `🚨 AUXILIO EN CARRETERA (24/7): ${tipoEmergencia}. Ubicación: ${ubicacion}. Auto: ${vehiculoPlaca || 'No especificado'}. Tel: ${telefonoContacto || cliente.usuario.telefono || 'Sin tel'}`
        }
      });
    }

    const ticketStr = citaAuxilio ? citaAuxilio.id.substring(0, 8) : 'EMERGENCIA';

    const mensajeTexto =
      `🚨 *SOLICITUD DE AUXILIO MECÁNICO 24/7 - ADN MOTORS*\n\n` +
      `👤 *Cliente:* ${cliente.usuario.nombreCompleto}\n` +
      `📞 *Contacto:* ${telefonoContacto || cliente.usuario.telefono || '70000000'}\n` +
      `🚗 *Placa/Auto:* ${vehiculoPlaca || 'No especificada'}\n` +
      `🛠️ *Emergencia:* ${tipoEmergencia}\n` +
      `📍 *Ubicación:* ${ubicacion}\n\n` +
      `*ID Ticket:* ${ticketStr}`;

    const whatsappUrl = `https://wa.me/59170000000?text=${encodeURIComponent(mensajeTexto)}`;

    return res.json({
      success: true,
      message: 'Solicitud de auxilio registrada con prioridad alta',
      ticketId: ticketStr,
      whatsappUrl
    });

  } catch (error) {
    console.error('Error solicitarAuxilioMecanico:', error);
    return res.status(500).json({ success: false, error: 'Error al registrar auxilio mecánico: ' + error.message });
  }
};