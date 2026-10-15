import PDFDocument from 'pdfkit';
import prisma from '../config/database.js';

export const generarFactura = async (req, res) => {
  try {
    const { citaId } = req.params;
    const { nitCliente, razonSocial } = req.body || {};

    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        cliente: { include: { usuario: true } },
        empleado: true,
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: { include: { inventario: true } }
      }
    });

    if (!cita) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    const existeFactura = await prisma.factura.findUnique({
      where: { citaId }
    });

    if (existeFactura) {
      return res.json({
        success: true,
        message: 'Reabriendo factura ya existente para esta OT',
        factura: {
          id: existeFactura.id,
          numero_factura: existeFactura.numeroFactura,
          fecha_emision: existeFactura.fechaEmision,
          total_bob: existeFactura.total
        }
      });
    }

    const totalServicios = cita.detalleServicios.reduce((sum, ds) => sum + Number(ds.servicio.costo), 0);
    const totalRepuestos = cita.citasRepuestos.reduce((sum, cr) => sum + Number(cr.subtotal), 0);
    const total = totalServicios + totalRepuestos;
    const numeroFactura = `FAC-${Date.now()}`;

    // Cálculos Fiscales Bolivia (IVA 13%, IT 3%, Neto 87%)
    const iva13 = Math.round((total * 0.13) * 100) / 100;
    const it3 = Math.round((total * 0.03) * 100) / 100;
    const neto87 = Math.round((total * 0.87) * 100) / 100;

    const detalleItemsServicios = cita.detalleServicios.map(ds => ({
      servicioId: ds.servicioId,
      descripcion: `[Servicio] ${ds.servicio.descripcion}`,
      cantidad: 1,
      precioUnitario: ds.servicio.costo,
      subtotal: ds.servicio.costo
    }));

    const primerServicioId = cita.detalleServicios[0]?.servicioId;

    const detalleItemsRepuestos = cita.citasRepuestos.map(cr => ({
      servicioId: primerServicioId,
      descripcion: `[Repuesto] ${cr.inventario.nombre} (${cr.inventario.codigo})`,
      cantidad: cr.cantidad,
      precioUnitario: cr.precioUnitario,
      subtotal: cr.subtotal
    }));

    const factura = await prisma.factura.create({
      data: {
        numeroFactura,
        citaId,
        clienteId: cita.clienteId,
        usuarioId: req.user.id,
        total,
        detalleFacturas: {
          create: [...detalleItemsServicios, ...detalleItemsRepuestos]
        }
      },
      include: {
        cliente: { include: { usuario: true } },
        detalleFacturas: { include: { servicio: true } }
      }
    });

    return res.json({
      success: true,
      message: 'Factura oficial emitida con desglose tributario Bolivia (SIN)',
      factura: {
        id: factura.id,
        numero_factura: factura.numeroFactura,
        fecha_emision: factura.fechaEmision,
        nit_cliente: nitCliente || cita.cliente?.usuario?.telefono || '0',
        razon_social: razonSocial || cita.cliente?.usuario?.nombreCompleto || 'Sin Nombre',
        subtotal_neto_bob: neto87,
        iva_13_bob: iva13,
        it_3_bob: it3,
        total_bob: factura.total
      }
    });

  } catch (error) {
    console.error('Error generarFactura:', error);
    return res.status(500).json({ success: false, error: 'Error al generar factura' });
  }
};

export const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        cliente: { include: { usuario: true } },
        usuario: true,
        cita: {
          include: {
            empleado: { include: { usuario: true } }
          }
        },
        detalleFacturas: { include: { servicio: true } }
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    return res.json({
      numero_factura: factura.numeroFactura,
      fecha_emision: factura.fechaEmision,
      cliente_nombre: factura.cliente.usuario.nombreCompleto,
      cliente_email: factura.cliente.usuario.email,
      generado_por: factura.usuario.nombreCompleto,
      total: Number(factura.total),
      detalle: factura.detalleFacturas.map(df => ({
        descripcion: df.descripcion,
        cantidad: df.cantidad,
        precio_unitario: Number(df.precioUnitario),
        subtotal: Number(df.subtotal)
      }))
    });

  } catch (error) {
    console.error('Error obtenerFactura:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener factura' });
  }
};

const PDF_COMPANY = {
  name: 'ADN MOTORS',
  slogan: 'Taller Automotriz Profesional',
  address: 'Av. Principal #1234, Zona Central',
  phone: 'Tel: (591) 2 1234567',
  email: 'info@adnmotors.com',
  nit: 'NIT: 123456789012',
};

export const descargarFacturaPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        cliente: { include: { usuario: true } },
        usuario: true,
        cita: {
          include: {
            empleado: { include: { usuario: true } },
            detalleServicios: { include: { servicio: true } },
          }
        },
        detalleFacturas: { include: { servicio: true } },
      }
    });

    if (!factura) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numeroFactura}.pdf`);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 45,
      info: {
        Title: `Factura ${factura.numeroFactura}`,
        Author: 'ADN Motors',
        Subject: 'Factura de Servicio',
      },
    });

    doc.pipe(res);

    const pageWidth = doc.page.width - 90;
    const lm = 45;

    // Top bar
    doc.rect(0, 0, doc.page.width, 8).fill('#1a1a2e');

    // Header
    doc.y = 25;
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text(PDF_COMPANY.name, lm, 25);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(PDF_COMPANY.slogan, lm, doc.y + 2);

    doc.fontSize(7.5).font('Helvetica').fillColor('#444');
    doc.text(PDF_COMPANY.address, lm, doc.y + 2);
    doc.text(`${PDF_COMPANY.phone} | ${PDF_COMPANY.email}`, { align: 'left' });
    doc.text(PDF_COMPANY.nit, { align: 'left' });
    doc.moveDown(1.5);

    doc.moveTo(lm, doc.y).lineTo(lm + pageWidth, doc.y).stroke('#1a1a2e');
    doc.moveDown(0.8);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text('FACTURA', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#666').text(`N° ${factura.numeroFactura}`, { align: 'center' });
    doc.moveDown(1);

    // Info boxes
    const infoY = doc.y;
    doc.roundedRect(lm, infoY, pageWidth, 55, 3).fillAndStroke('#f8f8ff', '#ddd');
    doc.fillColor('#000');

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1a1a2e').text('CLIENTE', lm + 10, infoY + 7);
    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    doc.text(`Nombre: ${factura.cliente.usuario.nombreCompleto}`, lm + 10, infoY + 20);
    doc.text(`Email: ${factura.cliente.usuario.email}`, lm + 10, infoY + 33);
    doc.text(`Tel: ${factura.cliente.usuario.telefono || '—'}`, lm + 10, infoY + 46);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1a1a2e').text('FACTURA', lm + 200, infoY + 7);
    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    doc.text(`Número: ${factura.numeroFactura}`, lm + 200, infoY + 20);
    doc.text(`Emisión: ${new Date(factura.fechaEmision).toLocaleDateString('es-BO')}`, lm + 200, infoY + 33);
    doc.text(`Estado: ${factura.estado === 'emitida' ? 'EMITIDA' : factura.estado}`, lm + 200, infoY + 46);

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1a1a2e').text('SERVICIO', lm + 390, infoY + 7);
    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    doc.text(`Mecánico: ${factura.cita?.empleado?.usuario?.nombreCompleto || 'N/A'}`, lm + 390, infoY + 20);
    doc.text(`Fecha: ${new Date(factura.cita?.fechaCita).toLocaleDateString('es-BO')}`, lm + 390, infoY + 33);
    doc.text(`Generó: ${factura.usuario?.nombreCompleto || 'Sistema'}`, lm + 390, infoY + 46);

    doc.y = infoY + 65;

    // Table
    const tableTop = doc.y;
    const colStarts = [lm, lm + 250, lm + 310, lm + 390];

    doc.rect(lm, tableTop, pageWidth, 18).fill('#1a1a2e');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('DESCRIPCIÓN', colStarts[0] + 5, tableTop + 4);
    doc.text('CANT', colStarts[1] + 5, tableTop + 4);
    doc.text('P. UNIT.', colStarts[2] + 5, tableTop + 4);
    doc.text('SUBTOTAL', colStarts[3] + 5, tableTop + 4);

    let currentY = tableTop + 18;
    let rowNum = 0;

    const items = factura.detalleFacturas.length > 0
      ? factura.detalleFacturas.map(df => ({
          desc: df.descripcion,
          cant: df.cantidad || 1,
          pu: Number(df.precioUnitario),
          sub: Number(df.subtotal),
        }))
      : (factura.cita?.detalleServicios || []).map(ds => ({
          desc: ds.servicio.descripcion,
          cant: 1,
          pu: Number(ds.servicio.costo),
          sub: Number(ds.servicio.costo),
        }));

    for (const item of items) {
      const bgColor = rowNum % 2 === 0 ? '#FFFFFF' : '#f8f8ff';
      doc.rect(lm, currentY, pageWidth, 20).fill(bgColor);
      doc.fillColor('#333').fontSize(8).font('Helvetica');
      doc.text(item.desc, colStarts[0] + 5, currentY + 5);
      doc.text(String(item.cant), colStarts[1] + 5, currentY + 5);
      doc.text(`Bs. ${item.pu.toFixed(2)}`, colStarts[2] + 5, currentY + 5);
      doc.text(`Bs. ${item.sub.toFixed(2)}`, colStarts[3] + 5, currentY + 5);
      currentY += 20;
      rowNum++;
    }

    doc.moveTo(lm, currentY).lineTo(lm + pageWidth, currentY).stroke('#1a1a2e');
    currentY += 10;

    const totalWidth = 180;
    const totalX = lm + pageWidth - totalWidth;
    doc.rect(totalX, currentY, totalWidth, 25).fill('#1a1a2e');
    doc.fontSize(8).font('Helvetica').fillColor('#aaa').text('TOTAL A PAGAR:', totalX + 10, currentY + 3);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text(`Bs. ${Number(factura.total).toFixed(2)}`, totalX + 10, currentY + 12);

    currentY += 45;
    doc.moveTo(lm, currentY).lineTo(lm + pageWidth, currentY).stroke('#ddd');
    currentY += 10;

    doc.fontSize(7.5).font('Helvetica').fillColor('#999');
    doc.text(`${PDF_COMPANY.name} — ${PDF_COMPANY.address} | ${PDF_COMPANY.phone} | ${PDF_COMPANY.email}`, lm, currentY, { align: 'center' });
    doc.text('Gracias por su preferencia. Este documento tiene validez legal.', { align: 'center' });

    const bottomY = doc.page.height - 8;
    doc.rect(0, bottomY, doc.page.width, 8).fill('#1a1a2e');

    doc.end();

  } catch (error) {
    console.error('Error descargarFacturaPDF:', error);
    return res.status(500).json({ success: false, error: 'Error al generar PDF' });
  }
};