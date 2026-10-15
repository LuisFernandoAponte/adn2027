import db from "../config/db.js";
import PDFDocument from "pdfkit";


//aqui va la logica real de generar factura

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2
  }).format(value);
const generarFactura = async (citaId, usuarioId) => {

  
  const pool= db.getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    //  Verificar cita completada
    const [cita] = await connection.query(
      "SELECT * FROM citas WHERE id = ? AND estado = 'Completado'",
      [citaId]
    );

    if (cita.length === 0) {
      throw new Error("La cita no existe o no está completada");
    }

    // Verificar que no tenga factura
    const [facturaExistente] = await connection.query(
      "SELECT id FROM factura WHERE cita_id = ?",
      [citaId]
    );

    if (facturaExistente.length > 0) {
      throw new Error("La cita ya tiene factura");
    }

    //  Obtener servicios
    const [servicios] = await connection.query(`
      SELECT s.id, s.descripcion, s.costo
      FROM detalle_servicio ds
      JOIN servicios s ON ds.servicio_id = s.id
      WHERE ds.cita_id = ?
    `, [citaId]);

    if (servicios.length === 0) {
      throw new Error("La cita no tiene servicios");
    }

    //  Calcular total
    let total = 0;
    servicios.forEach(s => total += parseFloat(s.costo));

    //  Generar número factura
    const numeroFactura = "FAC-" + Date.now();

    //  Insertar factura
    const [resultFactura] = await connection.query(`
      INSERT INTO factura (numero_factura, cita_id, cliente_id, usuario_id, total)
      VALUES (?, ?, ?, ?, ?)
    `, [
      numeroFactura,
      citaId,
      cita[0].cliente_id,
      usuarioId,
      total
    ]);

    const facturaId = resultFactura.insertId;

    //  Insertar detalle
    for (let servicio of servicios) {
      await connection.query(`
        INSERT INTO detalle_factura
        (factura_id, servicio_id, descripcion, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `, [
        facturaId,
        servicio.id,
        servicio.descripcion,
        servicio.costo,
        servicio.costo
      ]);
    }

    // Cambiar estado de la cita a "Entregado"
    await connection.query(
      "UPDATE citas SET estado = 'Entregado' WHERE id = ?",
      [citaId]
    );

    await connection.query(
      `INSERT INTO estado_trabajo (estado, estado_anterior, fecha_cambio, cita_id, usuario_id)
       VALUES ('Entregado', 'Completado', NOW(), ?, ?)`,
      [citaId, usuarioId]
    );

    await connection.commit();

    return {
      id: facturaId,
      numeroFactura,
      total
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const obtenerFactura=async (facturaId)=>{
  const pool= db.getPool();
  const connection = await pool.getConnection();
   try {

    //  Obtener datos principales
    const [factura] = await connection.query(`
      SELECT 
        f.id,
        f.numero_factura,
        f.fecha_emision,
        f.total,
        f.estado,

        u.nombre_completo AS cliente_nombre,
        u.email AS cliente_email,

        uf.nombre_completo AS generado_por

      FROM factura f
      JOIN cliente c ON f.cliente_id = c.id
      JOIN usuario u ON c.usuario_id = u.id
      JOIN usuario uf ON f.usuario_id = uf.id
      WHERE f.id = ?
    `, [facturaId]);

    if (factura.length === 0) {
      throw new Error("Factura no encontrada");
    }

    // Obtener detalles
    const [detalle] = await connection.query(`
      SELECT descripcion, cantidad, precio_unitario, subtotal
      FROM detalle_factura
      WHERE factura_id = ?
    `, [facturaId]);

    return {
      ...factura[0],
      detalle
    };

  } finally {
    connection.release();
  }
}

const generarFacturaPDF = async (facturaId, res) => {
  const factura = await obtenerFactura(facturaId);

  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=factura-${factura.numero_factura}.pdf`
  );

  doc.pipe(res);

  // ===== HEADER =====
  doc
    .fontSize(22)
    .fillColor("#000")
    .text("ADN MOTORS", { align: "left" });

  doc
    .fontSize(10)
    .fillColor("#555")
    .text("Taller Automotriz Especializado")
    .text("Santa Cruz - Bolivia")
    .text("Tel: 77308697");

  doc.moveDown();

  doc
    .fontSize(16)
    .fillColor("#000")
    .text(`FACTURA`, { align: "right" });

  doc
    .fontSize(12)
    .text(`No: ${factura.numero_factura}`, { align: "right" })
    .text(
      `Fecha: ${new Date(factura.fecha_emision).toLocaleDateString("es-BO")}`,
      { align: "right" }
    );

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // ===== CLIENTE =====
  doc
    .fontSize(12)
    .fillColor("#000")
    .text("Datos del Cliente:", { underline: true });

  doc.moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Nombre: ${factura.cliente_nombre}`)
    .text(`Email: ${factura.cliente_email}`)
    .text(`Atendido por: ${factura.generado_por}`);

  doc.moveDown(2);

  // ===== TABLA =====
  const itemX = 50;
  const cantidadX = 300;
  const precioX = 370;
  const subtotalX = 460;
  const columnWidth=80;
  const tableTop = doc.y;

  doc.fontSize(12).text("Descripción", itemX, tableTop);
  doc.text("Cantidad", cantidadX, tableTop,{width: columnWidth, align: "right"});
  doc.text("Precio", precioX, tableTop,{width: columnWidth, align: "right"});
  doc.text("Subtotal", subtotalX, tableTop,{width: columnWidth, align: "right"});

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  let position = doc.y + 10;

  factura.detalle.forEach((item) => {
    doc
      .fontSize(11)
      .text(item.descripcion, itemX, position,{width: 240})
      .text(item.cantidad, cantidadX, position,{width: columnWidth, align: "right"})
      .text(formatCurrency(item.precio_unitario), precioX, position,{width: columnWidth, align: "right"})
      .text(formatCurrency(item.subtotal), subtotalX, position,{width: columnWidth, align: "right"});

    position += 25;
  });

  doc.moveTo(50, position).lineTo(550, position).stroke();

  // ===== TOTAL =====
  doc
    .fontSize(14)
    .fillColor("#000")
    .text(`Total: ${formatCurrency(factura.total)}`, 400, position + 25,{width: 150, align: "right"});

  doc.moveDown(4);

  // ===== FOOTER =====
  doc
    .fontSize(10)
    .fillColor("#666")
    .text("Gracias por confiar en ADN MOTORS", 50, 750, {
      align: "center"
    });

  doc.end();
};
export default { generarFactura, obtenerFactura, generarFacturaPDF };