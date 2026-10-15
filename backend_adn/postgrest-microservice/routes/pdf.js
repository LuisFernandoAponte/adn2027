import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { query } from '../services/db.js';

const router = Router();
const FORMATO_MONEDA = (v) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(v);

// GET /facturas/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: facturas } = await query(`
      SELECT f.id, f."numeroFactura", f."fechaEmision", f.total,
             u_cli."nombreCompleto" AS cliente_nombre, u_cli.email AS cliente_email,
             u_usr."nombreCompleto" AS generado_por
      FROM factura f
      JOIN cliente c ON f."clienteId" = c.id
      JOIN usuario u_cli ON c."usuarioId" = u_cli.id
      JOIN usuario u_usr ON f."usuarioId" = u_usr.id
      WHERE f.id = $1
    `, [id]);

    if (facturas.length === 0) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada' });
    }

    const factura = facturas[0];

    const { rows: detalle } = await query(
      'SELECT descripcion, cantidad, "precioUnitario", subtotal FROM detalle_factura WHERE "facturaId" = $1',
      [id]
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numeroFactura}.pdf`);
    doc.pipe(res);

    // HEADER
    doc.fontSize(22).fillColor('#000').text('ADN MOTORS', { align: 'left' });
    doc.fontSize(10).fillColor('#555')
      .text('Taller Automotriz Especializado')
      .text('Santa Cruz - Bolivia')
      .text('Tel: 77308697');

    doc.moveDown();
    doc.fontSize(16).fillColor('#000').text('FACTURA', { align: 'right' });
    doc.fontSize(12).text(`No: ${factura.numeroFactura}`, { align: 'right' })
      .text(`Fecha: ${new Date(factura.fechaEmision).toLocaleDateString('es-BO')}`, { align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // DATOS CLIENTE
    doc.fontSize(12).fillColor('#000').text('Datos del Cliente:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Nombre: ${factura.cliente_nombre}`)
      .text(`Email: ${factura.cliente_email}`)
      .text(`Atendido por: ${factura.generado_por}`);

    doc.moveDown(2);

    // TABLA
    const itemX = 50, cantidadX = 300, precioX = 370, subtotalX = 460;
    const columnWidth = 80;
    const tableTop = doc.y;

    doc.fontSize(12).text('Descripción', itemX, tableTop);
    doc.text('Cantidad', cantidadX, tableTop, { width: columnWidth, align: 'right' });
    doc.text('Precio', precioX, tableTop, { width: columnWidth, align: 'right' });
    doc.text('Subtotal', subtotalX, tableTop, { width: columnWidth, align: 'right' });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    let position = doc.y + 10;

    for (const item of detalle) {
      doc.fontSize(11)
        .text(item.descripcion, itemX, position, { width: 240 })
        .text(item.cantidad, cantidadX, position, { width: columnWidth, align: 'right' })
        .text(FORMATO_MONEDA(item.precioUnitario), precioX, position, { width: columnWidth, align: 'right' })
        .text(FORMATO_MONEDA(item.subtotal), subtotalX, position, { width: columnWidth, align: 'right' });
      position += 25;
    }

    doc.moveTo(50, position).lineTo(550, position).stroke();

    doc.fontSize(14).fillColor('#000')
      .text(`Total: ${FORMATO_MONEDA(factura.total)}`, 400, position + 25, { width: 150, align: 'right' });

    doc.moveDown(4);
    doc.fontSize(10).fillColor('#666')
      .text('Gracias por confiar en ADN MOTORS', 50, 750, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ success: false, error: 'Error al generar PDF' });
  }
});

export default router;
