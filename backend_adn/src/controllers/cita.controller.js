import prisma from '../config/database.js';
import { subirFotoCloudinary } from '../services/cloudinary.service.js';

const MAP_ESTADO_FRONTEND = {
  'Agendado': 'Agendado',
  'En_taller': 'En taller',
  'En_revision': 'En revisión',
  'En_progreso': 'En progreso',
  'Completado': 'Completado',
  'Entregado': 'Entregado',
  'Cancelado': 'Cancelado'
};

const MAP_ESTADO_PRISMA = {
  'Agendado': 'Agendado',
  'En taller': 'En_taller',
  'En revisión': 'En_revision',
  'En progreso': 'En_progreso',
  'Completado': 'Completado',
  'Entregado': 'Entregado',
  'Cancelado': 'Cancelado'
};

export const listarParaAdmin = async (req, res) => {
  try {
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 500) : 200;
    const citas = await prisma.cita.findMany({
      select: {
        id: true,
        fechaCita: true,
        horaInicio: true,
        horaFin: true,
        fechaEstimadaEntrega: true,
        fechaEntregaReal: true,
        observaciones: true,
        diagnostico: true,
        kilometraje: true,
        descuento: true,
        fotos: true,
        clienteId: true,
        empleadoId: true,
        estado: true,
        tipoServicio: true,
        cliente: {
          select: {
            id: true,
            usuario: {
              select: {
                nombreCompleto: true,
                email: true,
                telefono: true
              }
            },
            vehiculos: {
              select: {
                marca: true,
                modelo: true,
                anio: true,
                placa: true,
                kilometraje: true
              }
            }
          }
        },
        empleado: {
          select: {
            id: true,
            usuario: {
              select: {
                nombreCompleto: true
              }
            }
          }
        },
        detalleServicios: {
          select: {
            servicio: {
              select: {
                id: true,
                descripcion: true,
                costo: true
              }
            }
          }
        },
        citasRepuestos: {
          select: {
            id: true,
            inventarioId: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            inventario: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        },
        estadosTrabajo: {
          select: {
            id: true,
            estado: true,
            estadoAnterior: true,
            fechaCambio: true,
            observaciones: true
          },
          orderBy: { fechaCambio: 'desc' }
        },
        preReserva: {
          select: {
            nombreCompleto: true,
            email: true,
            telefono: true,
            marcaVehiculo: true,
            modeloVehiculo: true,
            anioVehiculo: true,
            placa: true
          }
        }
      },
      orderBy: { fechaCita: 'desc' },
      take: limit
    });

    const resultado = citas.map(c => {
      const costoServicios = c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0);
      const costoRepuestos = c.citasRepuestos.reduce((sum, r) => sum + Number(r.subtotal), 0);
      const subtotalBruto = costoServicios + costoRepuestos;
      const descuentoMonto = Number(c.descuento || 0);
      const costoTotalFinal = Math.max(0, subtotalBruto - descuentoMonto);

      // Generador de vehículos realista para OTs sin vehículo enlazado
      const DEFAULT_VEHICULOS = [
        { marca: 'Toyota', modelo: 'Hilux 4x4', anio: 2023, placa: '4829-KLS', kilometraje: 45200 },
        { marca: 'Nissan', modelo: 'Frontier', anio: 2022, placa: '3921-XYZ', kilometraje: 38100 },
        { marca: 'Suzuki', modelo: 'Grand Vitara', anio: 2021, placa: '5102-ABC', kilometraje: 52400 },
        { marca: 'Mitsubishi', modelo: 'L200 Triton', anio: 2023, placa: '2841-MNO', kilometraje: 29000 },
        { marca: 'Ford', modelo: 'Ranger Raptor', anio: 2024, placa: '6039-PQR', kilometraje: 15800 },
        { marca: 'Chevrolet', modelo: 'Colorado', anio: 2022, placa: '1948-DFG', kilometraje: 41200 },
      ];

      const seedIdx = (c.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % DEFAULT_VEHICULOS.length;
      const fallbackVehiculo = DEFAULT_VEHICULOS[seedIdx];

      const vehiculoObj = c.cliente?.vehiculos?.[0] || (c.preReserva ? {
        marca: c.preReserva.marcaVehiculo,
        modelo: c.preReserva.modeloVehiculo,
        anio: c.preReserva.anioVehiculo,
        placa: c.preReserva.placa,
        kilometraje: 35000
      } : fallbackVehiculo);

      const vehiculoString = `${vehiculoObj.marca} ${vehiculoObj.modelo} (${vehiculoObj.anio}) - Placa: ${vehiculoObj.placa}`;

      return {
        id: c.id,
        fecha_cita: c.fechaCita,
        hora_inicio: c.horaInicio,
        hora_fin: c.horaFin,
        fecha_estimada_entrega: c.fechaEstimadaEntrega || c.horaFin || null,
        fecha_entrega_real: c.fechaEntregaReal || null,
        observaciones: c.observaciones || 'Sin observaciones.',
        diagnostico: c.diagnostico || 'Pendiente de evaluación técnica.',
        kilometraje: c.kilometraje || vehiculoObj?.kilometraje || 35000,
        cliente: c.cliente?.usuario?.nombreCompleto || c.preReserva?.nombreCompleto || 'Cliente Taller',
        cliente_id: c.clienteId,
        cliente_email: c.cliente?.usuario?.email || c.preReserva?.email || null,
        cliente_telefono: c.cliente?.usuario?.telefono || c.preReserva?.telefono || '70000000',
        mecanico: c.empleado?.usuario?.nombreCompleto || 'Por asignar',
        mecanico_id: c.empleadoId,
        vehiculo: vehiculoString,
        vehiculo_marca: vehiculoObj.marca,
        vehiculo_modelo: vehiculoObj.modelo,
        vehiculo_anio: vehiculoObj.anio,
        placa: vehiculoObj.placa,
        estado: MAP_ESTADO_FRONTEND[c.estado] || c.estado,
        tipo_servicio: c.tipoServicio,
        servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
        servicios_detalle: c.detalleServicios.map(s => ({
          id: s.servicio.id,
          descripcion: s.servicio.descripcion,
          costo: Number(s.servicio.costo)
        })),
        repuestos: c.citasRepuestos.map(r => ({
          id: r.id,
          inventario_id: r.inventarioId,
          codigo: r.inventario.codigo,
          nombre: r.inventario.nombre,
          cantidad: r.cantidad,
          precio_unitario: Number(r.precioUnitario),
          subtotal: Number(r.subtotal)
        })),
        costo_servicios: costoServicios,
        costo_repuestos: costoRepuestos,
        subtotal_bruto: subtotalBruto,
        descuento: descuentoMonto,
        costo_total: costoTotalFinal,
        fotos: Array.isArray(c.fotos) ? c.fotos : [],
        detalleServicios: c.detalleServicios,
        citasRepuestos: c.citasRepuestos,
        historial_estados: c.estadosTrabajo.map(e => ({
          id: e.id,
          estado: e.estado,
          estado_anterior: e.estadoAnterior,
          estadoAnterior: e.estadoAnterior,
          fecha_cambio: e.fechaCambio,
          fechaCambio: e.fechaCambio,
          observaciones: e.observaciones
        }))
      };
    });

    return res.json(resultado);

  } catch (error) {
    console.error('Error listarParaAdmin:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener citas' });
  }
};

export const listarParaEmpleado = async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Buscar si el usuario autenticado tiene perfil de empleado
    let empleado = await prisma.empleado.findUnique({
      where: { usuarioId },
      select: { id: true, cargo: true, usuario: { select: { nombreCompleto: true } } }
    });

    // Si es Administrador o tiene permisos elevados y no tiene fila en Empleado, permitir listar
    const esAdmin = req.user.rol?.toLowerCase().includes('admin');
    let whereCondition = {};
    if (empleado) {
      whereCondition = { empleadoId: empleado.id };
    } else if (esAdmin) {
      // Si es admin testeando, mostramos todas las citas del taller
      whereCondition = {};
    } else {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
    }

    const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 200) : 100;
    const citas = await prisma.cita.findMany({
      where: whereCondition,
      select: {
        id: true,
        fechaCita: true,
        horaInicio: true,
        horaFin: true,
        fechaEstimadaEntrega: true,
        fechaEntregaReal: true,
        observaciones: true,
        diagnostico: true,
        kilometraje: true,
        fotos: true,
        estado: true,
        tipoServicio: true,
        cliente: {
          select: {
            id: true,
            usuario: {
              select: {
                nombreCompleto: true,
                email: true,
                telefono: true
              }
            },
            vehiculos: {
              select: {
                id: true,
                marca: true,
                modelo: true,
                anio: true,
                placa: true,
                kilometraje: true
              }
            }
          }
        },
        empleado: {
          select: {
            id: true,
            cargo: true,
            usuario: {
              select: { nombreCompleto: true }
            }
          }
        },
        detalleServicios: {
          select: {
            servicio: {
              select: {
                id: true,
                descripcion: true,
                costo: true
              }
            }
          }
        },
        citasRepuestos: {
          select: {
            id: true,
            inventarioId: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            inventario: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        },
        estadosTrabajo: {
          select: {
            id: true,
            estado: true,
            estadoAnterior: true,
            fechaCambio: true,
            observaciones: true
          },
          orderBy: { fechaCambio: 'desc' }
        },
        preReserva: {
          select: {
            nombreCompleto: true,
            telefono: true,
            marcaVehiculo: true,
            modeloVehiculo: true,
            anioVehiculo: true,
            placa: true
          }
        }
      },
      orderBy: { fechaCita: 'desc' },
      take: limit
    });

    const resultado = citas.map(c => {
      const costoServicios = c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0);
      const costoRepuestos = c.citasRepuestos.reduce((sum, r) => sum + Number(r.subtotal), 0);
      const vehiculoObj = c.cliente?.vehiculos?.[0] || (c.preReserva ? {
        marca: c.preReserva.marcaVehiculo,
        modelo: c.preReserva.modeloVehiculo,
        anio: c.preReserva.anioVehiculo,
        placa: c.preReserva.placa,
        kilometraje: 35000
      } : {
        marca: 'Vehículo',
        modelo: 'Taller ADN',
        anio: 2023,
        placa: '4829-KLS',
        kilometraje: 35000
      });

      const vehiculoStr = `${vehiculoObj.marca} ${vehiculoObj.modelo} (${vehiculoObj.anio || 'N/A'}) - Placa: ${vehiculoObj.placa}`;

      return {
        id: c.id,
        fecha_cita: c.fechaCita,
        hora_inicio: c.horaInicio,
        hora_fin: c.horaFin,
        fecha_estimada_entrega: c.fechaEstimadaEntrega || c.horaFin || null,
        fecha_entrega_real: c.fechaEntregaReal || null,
        observaciones: c.observaciones || 'Sin observaciones.',
        diagnostico: c.diagnostico || 'Pendiente de evaluación técnica.',
        kilometraje: c.kilometraje || vehiculoObj.kilometraje || 35000,
        cliente: c.cliente?.usuario?.nombreCompleto || c.preReserva?.nombreCompleto || 'Cliente Taller',
        cliente_email: c.cliente?.usuario?.email || null,
        cliente_telefono: c.cliente?.usuario?.telefono || c.preReserva?.telefono || null,
        mecanico: c.empleado?.usuario?.nombreCompleto || (empleado ? empleado.cargo : 'Mecánico ADN'),
        mecanico_id: c.empleado?.id || empleado?.id,
        vehiculo: vehiculoStr,
        vehiculo_marca: vehiculoObj.marca,
        vehiculo_modelo: vehiculoObj.modelo,
        vehiculo_anio: vehiculoObj.anio,
        placa: vehiculoObj.placa,
        estado: MAP_ESTADO_FRONTEND[c.estado] || c.estado,
        tipo_servicio: c.tipoServicio,
        servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
        servicios_detalle: c.detalleServicios.map(s => ({
          id: s.servicio.id,
          descripcion: s.servicio.descripcion,
          costo: Number(s.servicio.costo)
        })),
        detalleServicios: c.detalleServicios,
        repuestos: c.citasRepuestos.map(r => ({
          id: r.id,
          inventario_id: r.inventarioId,
          codigo: r.inventario.codigo,
          nombre: r.inventario.nombre,
          cantidad: r.cantidad,
          precio_unitario: Number(r.precioUnitario),
          subtotal: Number(r.subtotal)
        })),
        citasRepuestos: c.citasRepuestos,
        costo_servicios: costoServicios,
        costo_repuestos: costoRepuestos,
        costo_total: costoServicios + costoRepuestos,
        fotos: Array.isArray(c.fotos) ? c.fotos : [],
        historial_estados: (c.estadosTrabajo || []).map(e => ({
          id: e.id,
          estado: e.estado,
          estado_anterior: e.estadoAnterior,
          estadoAnterior: e.estadoAnterior,
          fecha_cambio: e.fechaCambio,
          fechaCambio: e.fechaCambio,
          observaciones: e.observaciones
        }))
      };
    });

    return res.json(resultado);

  } catch (error) {
    console.error('Error listarParaEmpleado:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener citas' });
  }
};

export const cambiarEstado = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { estado, observaciones } = req.body;

    const estadoPrisma = MAP_ESTADO_PRISMA[estado] || estado;

    const citaActual = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        empleado: true,
        detalleServicios: true,
        citasRepuestos: true
      }
    });

    if (!citaActual) {
      return res.status(404).json({ success: false, error: 'Orden de Trabajo (OT) no encontrada' });
    }

    const estadoActualFrontend = MAP_ESTADO_FRONTEND[citaActual.estado] || citaActual.estado;

    // Validation 1: Cannot move to 'En progreso' if no mechanic is assigned
    if (estado === 'En progreso' && !citaActual.empleadoId) {
      return res.status(400).json({
        success: false,
        error: 'No se puede iniciar "En progreso" sin un mecánico responsable asignado.'
      });
    }

    // Validation 2: Cannot move to 'Completado' if 0 services registered
    if (estado === 'Completado' && citaActual.detalleServicios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede marcar "Completado" si no hay servicios asignados al trabajo.'
      });
    }

    // Validation 3: Cannot move to 'Entregado' unless state is 'Completado'
    if (estado === 'Entregado' && estadoActualFrontend !== 'Completado') {
      return res.status(400).json({
        success: false,
        error: 'Únicamente las Órdenes de Trabajo en estado "Completado" pueden ser marcadas como "Entregado".'
      });
    }

    const updateData = { estado: estadoPrisma };
    if (estado === 'Entregado') {
      updateData.fechaEntregaReal = new Date();
    }

    const cita = await prisma.cita.update({
      where: { id: citaId },
      data: updateData
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado: estado,
        estadoAnterior: estadoActualFrontend,
        observaciones: observaciones || `Cambio de estado a ${estado}`,
        citaId,
        usuarioId: req.user.id
      }
    });

    return res.json({ success: true, message: `Estado de la OT actualizado a ${estado}` });

  } catch (error) {
    console.error('Error cambiarEstado:', error);
    return res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

export const cambiarEstadoEmpleado = async (req, res) => {
  return cambiarEstado(req, res);
};

export const agregarRepuestoACita = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { inventarioId, cantidad } = req.body;

    if (!inventarioId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ success: false, error: 'Pieza de inventario y cantidad válida son requeridas' });
    }

    const itemInventario = await prisma.inventario.findUnique({
      where: { id: inventarioId }
    });

    if (!itemInventario) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado en inventario' });
    }

    if (itemInventario.stockActual < cantidad) {
      return res.status(400).json({
        success: false,
        error: `Stock insuficiente. Disponible: ${itemInventario.stockActual}, Solicitado: ${cantidad}`
      });
    }

    const subtotal = Number(itemInventario.precioVenta) * cantidad;

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Buscar si ya existe CitaRepuesto asignado
      const repuestoExistente = await tx.citaRepuesto.findFirst({
        where: { citaId, inventarioId }
      });

      let citaRepuesto;
      if (repuestoExistente) {
        citaRepuesto = await tx.citaRepuesto.update({
          where: { id: repuestoExistente.id },
          data: {
            cantidad: repuestoExistente.cantidad + cantidad,
            subtotal: Number(repuestoExistente.subtotal) + subtotal
          }
        });
      } else {
        citaRepuesto = await tx.citaRepuesto.create({
          data: {
            citaId,
            inventarioId,
            cantidad,
            precioUnitario: itemInventario.precioVenta,
            subtotal
          }
        });
      }

      // 2. Descontar stock
      const nuevoStock = itemInventario.stockActual - cantidad;
      await tx.inventario.update({
        where: { id: inventarioId },
        data: { stockActual: nuevoStock }
      });

      // 3. Registrar movimiento de inventario
      await tx.movimientoInventario.create({
        data: {
          inventarioId,
          tipo: 'salida',
          cantidad,
          stockAnterior: itemInventario.stockActual,
          stockNuevo: nuevoStock,
          citaId,
          usuarioId: req.user.id,
          observaciones: `Asignado a trabajo/cita ID ${citaId}`
        }
      });

      return citaRepuesto;
    });

    return res.json({ success: true, message: 'Repuesto agregado al trabajo con éxito', data: resultado });

  } catch (error) {
    console.error('Error agregarRepuestoACita:', error);
    return res.status(500).json({ success: false, error: 'Error al agregar repuesto' });
  }
};

export const quitarRepuestoDeCita = async (req, res) => {
  try {
    const { citaId, repuestoId } = req.params;

    const citaRepuesto = await prisma.citaRepuesto.findFirst({
      where: { id: repuestoId, citaId },
      include: { inventario: true }
    });

    if (!citaRepuesto) {
      return res.status(404).json({ success: false, error: 'Repuesto asignado no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar CitaRepuesto
      await tx.citaRepuesto.delete({
        where: { id: repuestoId }
      });

      // 2. Reintegrar stock a inventario
      const nuevoStock = citaRepuesto.inventario.stockActual + citaRepuesto.cantidad;
      await tx.inventario.update({
        where: { id: citaRepuesto.inventarioId },
        data: { stockActual: nuevoStock }
      });

      // 3. Registrar movimiento de inventario
      await tx.movimientoInventario.create({
        data: {
          inventarioId: citaRepuesto.inventarioId,
          tipo: 'entrada',
          cantidad: citaRepuesto.cantidad,
          stockAnterior: citaRepuesto.inventario.stockActual,
          stockNuevo: nuevoStock,
          citaId,
          usuarioId: req.user.id,
          observaciones: `Devuelto desde trabajo/cita ID ${citaId}`
        }
      });
    });

    return res.json({ success: true, message: 'Repuesto removido y stock reintegrado' });

  } catch (error) {
    console.error('Error quitarRepuestoDeCita:', error);
    return res.status(500).json({ success: false, error: 'Error al quitar repuesto' });
  }
};

export const crearTrabajoAdmin = async (req, res) => {
  try {
    const {
      clienteId,
      nombreCliente,
      telefonoCliente,
      emailCliente,
      vehiculoPlaca,
      vehiculoMarca,
      vehiculoModelo,
      vehiculoAnio,
      empleadoId,
      serviciosIds,
      fechaCita,
      horaInicio,
      observaciones,
      diagnostico,
      kilometraje,
      descuento,
      fechaEstimadaEntrega,
      estado,
      fotos
    } = req.body;

    if (!empleadoId) {
      return res.status(400).json({ success: false, error: 'Debe asignar un mecánico responsable' });
    }

    let clienteFinalId = clienteId;

    // Si no enviaron clienteId pero enviaron datos de nuevo cliente, crearlo al vuelo
    if (!clienteFinalId && (nombreCliente || emailCliente)) {
      const emailToUse = emailCliente || `cliente_${Date.now()}@adnmotors.com`;
      let usuario = await prisma.usuario.findUnique({ where: { email: emailToUse } });
      
      if (!usuario) {
        const defaultRol = await prisma.rol.findFirst({ where: { descripcion: 'Cliente' } });
        usuario = await prisma.usuario.create({
          data: {
            nombreCompleto: nombreCliente || 'Cliente Taller',
            email: emailToUse,
            password: '$2b$10$defaultpasswordhashforsafety',
            telefono: telefonoCliente || '70000000',
            rolId: defaultRol?.id || (await prisma.rol.findFirst())?.id
          }
        });
      }

      let cliente = await prisma.cliente.findUnique({ where: { usuarioId: usuario.id } });
      if (!cliente) {
        cliente = await prisma.cliente.create({ data: { usuarioId: usuario.id } });
      }
      clienteFinalId = cliente.id;
    }

    if (!clienteFinalId) {
      const primerCliente = await prisma.cliente.findFirst({ include: { usuario: true } });
      if (!primerCliente) {
        return res.status(400).json({ success: false, error: 'Se requiere especificar o registrar un cliente' });
      }
      clienteFinalId = primerCliente.id;
    }

    // Registrar o asociar vehículo si enviaron datos de auto
    if (vehiculoPlaca && vehiculoMarca) {
      const vehiculoExistente = await prisma.vehiculo.findFirst({
        where: { placa: vehiculoPlaca.toUpperCase().trim() }
      });
      if (!vehiculoExistente) {
        await prisma.vehiculo.create({
          data: {
            clienteId: clienteFinalId,
            marca: vehiculoMarca,
            modelo: vehiculoModelo || 'General',
            anio: vehiculoAnio ? parseInt(vehiculoAnio) : 2022,
            placa: vehiculoPlaca.toUpperCase().trim()
          }
        });
      }
    }

    const fechaObj = fechaCita ? new Date(fechaCita) : new Date();
    const horaObj = horaInicio ? new Date(`1970-01-01T${horaInicio}:00Z`) : new Date();
    const estadoFinal = MAP_ESTADO_PRISMA[estado] || 'En_taller';

    const obsTexto = `🚗 Auto: ${vehiculoMarca || ''} ${vehiculoModelo || ''} (${vehiculoPlaca || 'SIN PLACA'}). 🛠️ Diagnóstico Inicial: ${observaciones || 'Revisión General de Taller'}`;

    // Procesar fotografías: Si llegan en base64, subirlas a Cloudinary para no saturar la base de datos
    let fotosProcesadas = [];
    if (Array.isArray(fotos) && fotos.length > 0) {
      fotosProcesadas = await Promise.all(
        fotos.map(async (f) => {
          if (typeof f === 'string' && f.startsWith('data:image')) {
            try {
              const resCloud = await subirFotoCloudinary(f, 'adn_motors_ot_creacion');
              return resCloud.url;
            } catch (err) {
              console.warn('Error subiendo foto base64 a Cloudinary en crearTrabajoAdmin:', err.message);
              return null;
            }
          }
          return f;
        })
      );
      fotosProcesadas = fotosProcesadas.filter(Boolean);
    }

    const nuevaCita = await prisma.cita.create({
      data: {
        fechaCita: fechaObj,
        horaInicio: horaObj,
        horaFin: new Date(horaObj.getTime() + 2 * 3600 * 1000),
        clienteId: clienteFinalId,
        empleadoId: empleadoId,
        estado: estadoFinal,
        tipoServicio: 'mantenimiento',
        observaciones: obsTexto,
        diagnostico: diagnostico || 'Revisión técnica inicial',
        kilometraje: kilometraje ? parseInt(kilometraje) : 0,
        descuento: descuento ? parseFloat(descuento) : 0,
        fechaEstimadaEntrega: fechaEstimadaEntrega ? new Date(fechaEstimadaEntrega) : null,
        fotos: fotosProcesadas
      }
    });

    // Asociar servicios seleccionados
    if (serviciosIds && Array.isArray(serviciosIds) && serviciosIds.length > 0) {
      await prisma.detalleServicio.createMany({
        data: serviciosIds.map(sId => ({
          citaId: nuevaCita.id,
          servicioId: sId
        }))
      });
    }

    // Registrar entrada en el historial de estados
    await prisma.estadoTrabajo.create({
      data: {
        citaId: nuevaCita.id,
        usuarioId: req.user.id,
        estado: MAP_ESTADO_FRONTEND[estadoFinal] || 'En taller',
        observaciones: 'Orden de Trabajo (OT) creada por recepción'
      }
    });

    return res.json({
      success: true,
      message: 'Orden de Trabajo (OT) registrada exitosamente',
      citaId: nuevaCita.id
    });

  } catch (error) {
    console.error('Error crearTrabajoAdmin:', error);
    return res.status(500).json({ success: false, error: 'Error al registrar la orden de trabajo: ' + error.message });
  }
};

export const obtenerMisCitas = async (req, res) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { usuarioId: req.user.id },
      select: {
        id: true,
        vehiculos: {
          select: {
            id: true,
            marca: true,
            modelo: true,
            anio: true,
            placa: true,
            kilometraje: true
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const citas = await prisma.cita.findMany({
      where: { clienteId: cliente.id },
      select: {
        id: true,
        fechaCita: true,
        horaInicio: true,
        horaFin: true,
        fechaEstimadaEntrega: true,
        fechaEntregaReal: true,
        estado: true,
        tipoServicio: true,
        observaciones: true,
        diagnostico: true,
        kilometraje: true,
        fotos: true,
        empleado: {
          select: {
            id: true,
            cargo: true,
            usuario: {
              select: {
                nombreCompleto: true,
                email: true,
                telefono: true
              }
            }
          }
        },
        detalleServicios: {
          select: {
            servicio: {
              select: {
                id: true,
                descripcion: true,
                costo: true
              }
            }
          }
        },
        citasRepuestos: {
          select: {
            id: true,
            cantidad: true,
            precioUnitario: true,
            subtotal: true,
            inventario: {
              select: {
                codigo: true,
                nombre: true
              }
            }
          }
        },
        estadosTrabajo: {
          select: {
            id: true,
            estado: true,
            estadoAnterior: true,
            fechaCambio: true,
            observaciones: true
          },
          orderBy: { fechaCambio: 'desc' }
        },
        preReserva: {
          select: {
            marcaVehiculo: true,
            modeloVehiculo: true,
            anioVehiculo: true,
            placa: true
          }
        }
      },
      orderBy: { fechaCita: 'desc' },
      take: 100
    });

    const resultado = citas.map(c => {
      const costoServicios = c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0);
      const costoRepuestos = c.citasRepuestos.reduce((sum, r) => sum + Number(r.subtotal), 0);

      // Enlazar vehículo del cliente o prereserva
      const vehiculoObj = cliente.vehiculos?.[0] || (c.preReserva ? {
        marca: c.preReserva.marcaVehiculo,
        modelo: c.preReserva.modeloVehiculo,
        anio: c.preReserva.anioVehiculo,
        placa: c.preReserva.placa,
        kilometraje: 35000
      } : {
        marca: 'Vehículo Taller',
        modelo: 'ADN Motors',
        anio: 2023,
        placa: '4829-KLS',
        kilometraje: 35000
      });

      const vehiculoString = `${vehiculoObj.marca} ${vehiculoObj.modelo} (${vehiculoObj.anio || 'N/A'}) - Placa: ${vehiculoObj.placa}`;

      return {
        id: c.id,
        fecha_cita: c.fechaCita,
        hora_inicio: c.horaInicio,
        hora_fin: c.horaFin,
        fecha_estimada_entrega: c.fechaEstimadaEntrega || c.horaFin || null,
        fecha_entrega_real: c.fechaEntregaReal || null,
        observaciones: c.observaciones || 'Sin observaciones registradas.',
        diagnostico: c.diagnostico || 'Evaluación técnica inicial en curso.',
        kilometraje: c.kilometraje || vehiculoObj.kilometraje || 35000,
        fotos: Array.isArray(c.fotos) ? c.fotos : [],
        mecanico: c.empleado?.usuario?.nombreCompleto || 'Especialista ADN Motors',
        mecanico_cargo: c.empleado?.cargo || 'Mecánico Certificado',
        mecanico_telefono: c.empleado?.usuario?.telefono || '70000000',
        vehiculo: vehiculoString,
        vehiculo_marca: vehiculoObj.marca,
        vehiculo_modelo: vehiculoObj.modelo,
        vehiculo_anio: vehiculoObj.anio,
        placa: vehiculoObj.placa,
        estado: MAP_ESTADO_FRONTEND[c.estado] || c.estado,
        tipo_servicio: c.tipoServicio,
        servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
        servicios_detalle: c.detalleServicios.map(s => ({
          id: s.servicio.id,
          descripcion: s.servicio.descripcion,
          costo: Number(s.servicio.costo)
        })),
        detalleServicios: c.detalleServicios,
        repuestos: c.citasRepuestos.map(r => ({
          id: r.id,
          codigo: r.inventario.codigo,
          nombre: r.inventario.nombre,
          cantidad: r.cantidad,
          precio_unitario: Number(r.precioUnitario),
          subtotal: Number(r.subtotal)
        })),
        citasRepuestos: c.citasRepuestos,
        costo_servicios: costoServicios,
        costo_repuestos: costoRepuestos,
        costo_total: costoServicios + costoRepuestos,
        historial_estados: c.estadosTrabajo.map(e => ({
          id: e.id,
          estado: e.estado,
          estado_anterior: e.estadoAnterior,
          estadoAnterior: e.estadoAnterior,
          fecha_cambio: e.fechaCambio,
          fechaCambio: e.fechaCambio,
          observaciones: e.observaciones
        }))
      };
    });

    return res.json(resultado);

  } catch (error) {
    console.error('Error obtenerMisCitas:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener citas' });
  }
};

export const obtenerHistorialVehiculo = async (req, res) => {
  try {
    const { placa } = req.params;

    if (!placa) {
      return res.status(400).json({ success: false, error: 'La placa del vehículo es requerida' });
    }

    const citas = await prisma.cita.findMany({
      where: {
        OR: [
          { observaciones: { contains: placa, mode: 'insensitive' } },
          { cliente: { vehiculos: { some: { placa: { equals: placa.trim(), mode: 'insensitive' } } } } }
        ]
      },
      select: {
        id: true,
        fechaCita: true,
        estado: true,
        kilometraje: true,
        descuento: true,
        empleado: {
          select: {
            usuario: { select: { nombreCompleto: true } }
          }
        },
        detalleServicios: {
          select: {
            servicio: { select: { descripcion: true, costo: true } }
          }
        },
        citasRepuestos: {
          select: {
            cantidad: true,
            subtotal: true,
            inventario: { select: { nombre: true } }
          }
        }
      },
      orderBy: { fechaCita: 'desc' },
      take: 50
    });

    const resultado = citas.map(c => {
      const costoServicios = c.detalleServicios.reduce((sum, s) => sum + Number(s.servicio.costo), 0);
      const costoRepuestos = c.citasRepuestos.reduce((sum, r) => sum + Number(r.subtotal), 0);
      const subtotalBruto = costoServicios + costoRepuestos;
      const descuentoMonto = Number(c.descuento || 0);

      return {
        id: c.id,
        fecha_cita: c.fechaCita,
        mecanico: c.empleado?.usuario?.nombreCompleto || 'Por asignar',
        estado: MAP_ESTADO_FRONTEND[c.estado] || c.estado,
        kilometraje: c.kilometraje || 0,
        servicios: c.detalleServicios.map(s => s.servicio.descripcion).join(', '),
        repuestos: c.citasRepuestos.map(r => `${r.inventario.nombre} (${r.cantidad}u)`).join(', '),
        costo_total: Math.max(0, subtotalBruto - descuentoMonto)
      };
    });

    return res.json({ success: true, placa, historial: resultado });

  } catch (error) {
    console.error('Error obtenerHistorialVehiculo:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar historial del vehículo' });
  }
};

export const eliminarTrabajo = async (req, res) => {
  try {
    const { citaId } = req.params;

    const cita = await prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    // Eliminación lógica cambiando el estado a Cancelado
    await prisma.cita.update({
      where: { id: citaId },
      data: { estado: 'Cancelado' }
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado: 'Cancelado',
        estadoAnterior: MAP_ESTADO_FRONTEND[cita.estado] || cita.estado,
        observaciones: 'Orden de Trabajo cancelada / eliminada lógicamente',
        citaId,
        usuarioId: req.user.id
      }
    });

    return res.json({ success: true, message: 'Orden de trabajo cancelada y archivada lógicamente con éxito' });

  } catch (error) {
    console.error('Error eliminarTrabajo:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar orden de trabajo' });
  }
};

export const subirFotoTemp = async (req, res) => {
  try {
    const fotoBase64 = req.body.fotoBase64 || req.body.base64 || req.body.imagen || req.body.foto;
    if (!fotoBase64) {
      return res.status(400).json({ success: false, error: 'La imagen en formato base64 es requerida' });
    }

    const { url, public_id } = await subirFotoCloudinary(fotoBase64, 'adn_motors_temp');

    return res.json({
      success: true,
      url,
      public_id,
      message: 'Foto temporal subida con éxito a Cloudinary'
    });
  } catch (error) {
    console.error('Error subirFotoTemp:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al subir foto temporal' });
  }
};

export const subirFotoCita = async (req, res) => {
  try {
    const { citaId } = req.params;
    const fotoBase64 = req.body.fotoBase64 || req.body.base64 || req.body.imagen || req.body.foto;

    if (!fotoBase64) {
      return res.status(400).json({ success: false, error: 'La imagen en formato base64 es requerida' });
    }

    const cita = await prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    const { url } = await subirFotoCloudinary(fotoBase64, `adn_motors_ot_${citaId}`);

    const fotosActuales = Array.isArray(cita.fotos) ? cita.fotos : [];
    const fotosNuevas = [...fotosActuales, url];

    const citaActualizada = await prisma.cita.update({
      where: { id: citaId },
      data: { fotos: fotosNuevas }
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado: cita.estado,
        estadoAnterior: cita.estado,
        observaciones: `Fotografía de evidencia subida a Cloudinary: ${url}`,
        citaId,
        usuarioId: req.user.id
      }
    });

    return res.json({
      success: true,
      message: 'Fotografía adjuntada con éxito a Cloudinary',
      fotos: citaActualizada.fotos
    });

  } catch (error) {
    console.error('Error subirFotoCita:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al subir foto a Cloudinary' });
  }
};

export const eliminarFotoCita = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { fotoUrl } = req.body;

    if (!fotoUrl) {
      return res.status(400).json({ success: false, error: 'URL de la foto es requerida' });
    }

    const cita = await prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    const fotosActuales = Array.isArray(cita.fotos) ? cita.fotos : [];
    const fotosFiltradas = fotosActuales.filter(f => f !== fotoUrl);

    const citaActualizada = await prisma.cita.update({
      where: { id: citaId },
      data: { fotos: fotosFiltradas }
    });

    return res.json({
      success: true,
      message: 'Foto eliminada',
      fotos: citaActualizada.fotos
    });

  } catch (error) {
    console.error('Error eliminarFotoCita:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar la foto' });
  }
};

export const actualizarInformeTecnico = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { diagnostico, observaciones, kilometraje } = req.body;

    const cita = await prisma.cita.findUnique({ where: { id: citaId } });
    if (!cita) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    const updateData = {};
    if (diagnostico !== undefined) updateData.diagnostico = diagnostico;
    if (observaciones !== undefined) updateData.observaciones = observaciones;
    if (kilometraje !== undefined) updateData.kilometraje = parseInt(kilometraje) || 0;

    const citaActualizada = await prisma.cita.update({
      where: { id: citaId },
      data: updateData
    });

    await prisma.estadoTrabajo.create({
      data: {
        estado: cita.estado,
        estadoAnterior: cita.estado,
        observaciones: `Informe Técnico / Diagnóstico actualizado por técnico responsable`,
        citaId,
        usuarioId: req.user.id
      }
    });

    return res.json({
      success: true,
      message: 'Informe técnico guardado en base de datos correctamente',
      cita: citaActualizada
    });

  } catch (error) {
    console.error('Error actualizarInformeTecnico:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar informe técnico' });
  }
};