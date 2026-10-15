import prisma from '../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const crearPreReserva = async (req, res) => {
  try {
    const { 
      nombre_completo, 
      telefono, 
      email, 
      marca_vehiculo, 
      modelo_vehiculo, 
      anio_vehiculo, 
      placa,
      tipo_servicio,
      descripcion_problema,
      fecha_cita,
      hora_cita,
      empleado_id
    } = req.body;

    if (!nombre_completo || !telefono || !email || !tipo_servicio || !fecha_cita || !hora_cita) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos para la pre-reserva' 
      });
    }

    let usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() }
    });

    let clienteId = null;

    if (usuario) {
      const cliente = await prisma.cliente.findUnique({
        where: { usuarioId: usuario.id }
      });
      clienteId = cliente?.id;
    }

    const tokenVerificacion = crypto.randomBytes(32).toString('hex');
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let preReserva = await prisma.preReserva.create({
      data: {
        nombreCompleto: nombre_completo,
        telefono,
        email: email.toLowerCase(),
        marcaVehiculo: marca_vehiculo || null,
        modeloVehiculo: modelo_vehiculo || null,
        anioVehiculo: anio_vehiculo ? parseInt(anio_vehiculo) : null,
        placa: placa || null,
        tipoServicio: tipo_servicio,
        descripcionProblema: descripcion_problema || null,
        fechaCita: new Date(fecha_cita + 'T00:00:00'),
        horaCita: new Date('1970-01-01T' + hora_cita),
        empleadoId: empleado_id || null,
        clienteId,
        usuarioId: usuario?.id,
        tokenVerificacion,
        expiracionVerificacion: expiracion,
        estado: 'PENDIENTE'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Pre-reserva creada. Se envió enlace de verificación a tu correo.',
      reserva: {
        id: preReserva.id,
        email: preReserva.email
      }
    });

  } catch (error) {
    console.error('Error crearPreReserva:', error);
    return res.status(500).json({ success: false, error: 'Error al crear pre-reserva' });
  }
};

export const verificarPreReserva = async (req, res) => {
  try {
    const { token } = req.params;

    const preReserva = await prisma.preReserva.findFirst({
      where: { tokenVerificacion: token }
    });

    if (!preReserva) {
      return res.status(404).json({ success: false, error: 'Token inválido' });
    }

    if (new Date() > preReserva.expiracionVerificacion) {
      return res.status(400).json({ success: false, error: 'El enlace expiró' });
    }

    if (preReserva.estado === 'CONFIRMADO') {
      return res.status(400).json({ success: false, error: 'La reserva ya fue confirmada' });
    }

    let usuarioId = preReserva.usuarioId;

    if (!usuarioId) {
      const passwordTemporal = crypto.randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(passwordTemporal, 10);

      const rolCliente = await prisma.rol.findUnique({
        where: { descripcion: 'Cliente' }
      });

      if (!rolCliente) {
        return res.status(500).json({ success: false, error: 'Rol Cliente no encontrado' });
      }

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          nombreCompleto: preReserva.nombreCompleto,
          email: preReserva.email,
          telefono: preReserva.telefono,
          password: passwordHash,
          rolId: rolCliente.id,
          emailVerificado: true
        }
      });

      await prisma.cliente.create({
        data: { usuarioId: nuevoUsuario.id }
      });

      usuarioId = nuevoUsuario.id;
    }

    const cliente = await prisma.cliente.findFirst({
      where: { usuarioId }
    });

    if (!cliente) {
      return res.status(500).json({ success: false, error: 'Cliente no encontrado' });
    }

    const empleadosActivos = await prisma.empleado.findMany({
      where: { estado: true },
      take: 1,
      orderBy: { fechaReg: 'asc' }
    });

    const empleadoId = preReserva.empleadoId || empleadosActivos[0]?.id;

    if (!empleadoId) {
      return res.status(400).json({ success: false, error: 'No hay empleados disponibles' });
    }

    const tipoServicioMap = {
      'mantenimiento': 'revision',
      'diagnostico': 'revision',
      'reparacion': 'reparacion',
      'electricidad': 'reparacion',
      'alineacion': 'revision',
      'frenos': 'revision',
      'otro': 'revision'
    };

    const horaStr = typeof preReserva.horaCita === 'string' 
      ? preReserva.horaCita 
      : preReserva.horaCita.toTimeString().split(' ')[0];
    const horaTime = new Date('1970-01-01T' + horaStr);
    
    const cita = await prisma.cita.create({
      data: {
        fechaCita: preReserva.fechaCita,
        horaInicio: horaTime,
        clienteId: cliente.id,
        empleadoId: empleadoId,
        tipoServicio: tipoServicioMap[preReserva.tipoServicio] || 'revision',
        estado: 'Agendado'
      },
      include: {
        cliente: { include: { usuario: true } },
        empleado: { include: { usuario: true } }
      }
    });

    if (preReserva.marcaVehiculo) {
      await prisma.vehiculo.upsert({
        where: { 
          placa: preReserva.placa || 'SIN-PLACA-' + cita.id 
        },
        create: {
          marca: preReserva.marcaVehiculo,
          modelo: preReserva.modeloVehiculo || 'No especificado',
          anio: preReserva.anioVehiculo || null,
          placa: preReserva.placa || 'SIN-PLACA-' + cita.id,
          clienteId: cliente.id
        },
        update: {}
      });
    }

    await prisma.preReserva.update({
      where: { id: preReserva.id },
      data: {
        estado: 'CONFIRMADO',
        citaId: cita.id,
        tokenVerificacion: null
      }
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado: 'Agendado',
        citaId: cita.id,
        usuarioId: usuarioId
      }
    });

    return res.json({
      success: true,
      message: 'Reserva confirmada exitosamente',
      cita: {
        id: cita.id,
        fecha: cita.fechaCita,
        hora: preReserva.horaCita,
        empleado: cita.empleado.usuario.nombreCompleto,
        estado: 'Agendado'
      }
    });

  } catch (error) {
    console.error('Error verificarPreReserva:', error);
    return res.status(500).json({ success: false, error: 'Error al confirmar reserva' });
  }
};

export const verificarTokenPreReserva = async (req, res) => {
  try {
    const { token } = req.params;

    const preReserva = await prisma.preReserva.findFirst({
      where: { tokenVerificacion: token }
    });

    if (!preReserva) {
      return res.status(404).json({ success: false, error: 'Token inválido o ya usado' });
    }

    if (new Date() > preReserva.expiracionVerificacion) {
      return res.status(400).json({ success: false, error: 'El enlace expiró', expirado: true });
    }

    return res.json({
      success: true,
      preReserva: {
        nombre_completo: preReserva.nombreCompleto,
        email: preReserva.email,
        telefono: preReserva.telefono,
        tipo_servicio: preReserva.tipoServicio,
        fecha_cita: preReserva.fechaCita,
        hora_cita: preReserva.horaCita,
        estado: preReserva.estado
      }
    });

  } catch (error) {
    console.error('Error verificarTokenPreReserva:', error);
    return res.status(500).json({ success: false, error: 'Error al verificar token' });
  }
};

export const verificarDisponibilidad = async (req, res) => {
  try {
    const { fecha_cita, hora_cita, empleado_id } = req.query;

    if (!fecha_cita || !hora_cita) {
      return res.status(400).json({ 
        success: false, 
        error: 'Fecha y hora son requeridas' 
      });
    }

    const citaExistente = await prisma.cita.findFirst({
      where: {
        empleadoId: empleado_id || undefined,
        fechaCita: new Date(fecha_cita + 'T00:00:00'),
        estado: { not: 'Cancelado' }
      }
    });

    if (citaExistente) {
      return res.json({
        success: true,
        disponible: false,
        mensaje: 'El horario seleccionado ya no está disponible'
      });
    }

    return res.json({
      success: true,
      disponible: true,
      mensaje: 'Horario disponible'
    });

  } catch (error) {
    console.error('Error verificarDisponibilidad:', error);
    return res.status(500).json({ success: false, error: 'Error al verificar disponibilidad' });
  }
};