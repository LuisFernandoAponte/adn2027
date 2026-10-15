import prisma from '../config/database.js';

export const listarPagos = async (req, res) => {
  try {
    const pagos = await prisma.pago.findMany({
      include: {
        factura: {
          select: { numeroFactura: true, total: true, clienteId: true }
        }
      },
      orderBy: { fechaPago: 'desc' },
    });

    return res.json(pagos.map(p => ({
      id: p.id,
      factura_numero: p.factura.numeroFactura,
      monto: Number(p.monto),
      metodo: p.metodo,
      referencia: p.referencia,
      estado: p.estado,
      fecha_pago: p.fechaPago,
    })));
  } catch (error) {
    console.error('Error listarPagos:', error);
    return res.status(500).json({ success: false, error: 'Error al listar pagos' });
  }
};

export const crearPago = async (req, res) => {
  try {
    const { facturaId, monto, metodo, referencia } = req.body;

    if (!facturaId || !monto) {
      return res.status(400).json({ success: false, error: 'facturaId y monto son requeridos' });
    }

    const factura = await prisma.factura.findUnique({ where: { id: facturaId } });
    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    const pago = await prisma.pago.create({
      data: {
        facturaId,
        monto,
        metodo: metodo || 'efectivo',
        referencia: referencia || null,
      },
    });

    const pagosSum = await prisma.pago.aggregate({
      where: { facturaId, estado: 'completado' },
      _sum: { monto: true },
    });

    if (Number(pagosSum._sum.monto) >= Number(factura.total)) {
      await prisma.factura.update({
        where: { id: facturaId },
        data: { estado: 'pagada' },
      });
    }

    return res.status(201).json({ success: true, pago: { id: pago.id, monto: Number(pago.monto), metodo: pago.metodo, estado: pago.estado } });
  } catch (error) {
    console.error('Error crearPago:', error);
    return res.status(500).json({ success: false, error: 'Error al crear pago' });
  }
};

export const obtenerPago = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await prisma.pago.findUnique({
      where: { id },
      include: {
        factura: {
          include: {
            cliente: { include: { usuario: true } },
          },
        },
      },
    });

    if (!pago) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    return res.json({
      id: pago.id,
      factura_id: pago.facturaId,
      factura_numero: pago.factura.numeroFactura,
      cliente_nombre: pago.factura.cliente.usuario.nombreCompleto,
      monto: Number(pago.monto),
      metodo: pago.metodo,
      referencia: pago.referencia,
      estado: pago.estado,
      fecha_pago: pago.fechaPago,
    });
  } catch (error) {
    console.error('Error obtenerPago:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener pago' });
  }
};

export const anularPago = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado: 'anulado' },
    });

    const factura = await prisma.factura.findUnique({
      where: { id: pago.facturaId },
      include: { pagos: true },
    });

    if (factura && factura.estado === 'pagada') {
      const hasCompletados = factura.pagos.some(p => p.id !== id && p.estado === 'completado');
      if (!hasCompletados) {
        await prisma.factura.update({
          where: { id: factura.id },
          data: { estado: 'emitida' },
        });
      }
    }

    return res.json({ success: true, message: 'Pago anulado' });
  } catch (error) {
    console.error('Error anularPago:', error);
    return res.status(500).json({ success: false, error: 'Error al anular pago' });
  }
};
