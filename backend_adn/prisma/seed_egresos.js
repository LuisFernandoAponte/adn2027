import prisma from '../src/config/database.js';

async function seedEgresos() {
  console.log('🌱 Sembrando egresos de prueba para el taller...');

  const admin = await prisma.usuario.findFirst({
    where: { rol: { descripcion: 'Administrador' } }
  });

  if (!admin) {
    console.error('No se encontró usuario administrador.');
    process.exit(1);
  }

  const mecanicoCarlos = await prisma.empleado.findFirst({
    where: { usuario: { nombreCompleto: { contains: 'Carlos' } } }
  });

  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();

  const egresosData = [
    {
      descripcion: 'Pago Factura Luz Eléctrica (CRE) - Galpón y Taller',
      categoria: 'servicios_basicos',
      monto: 680.00,
      fecha: new Date(y, m, 5),
      metodoPago: 'transferencia',
      referenciaComprobante: 'CRE-FACT-88912',
      observaciones: 'Consumo por compresores y cabina de diagnóstico',
      usuarioId: admin.id
    },
    {
      descripcion: 'Pago Servicio de Agua Potable (SAGUAPAC)',
      categoria: 'servicios_basicos',
      monto: 165.50,
      fecha: new Date(y, m, 6),
      metodoPago: 'efectivo',
      referenciaComprobante: 'SAG-44120',
      observaciones: 'Lavado de piezas y uso general',
      usuarioId: admin.id
    },
    {
      descripcion: 'Internet Fibra Óptica Tigo Business 200 Mbps',
      categoria: 'servicios_basicos',
      monto: 280.00,
      fecha: new Date(y, m, 8),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TIGO-882194',
      observaciones: 'Conexión para scanners automotrices y sistema',
      usuarioId: admin.id
    },
    {
      descripcion: 'Alquiler Mensual del Galpón y Parqueo',
      categoria: 'alquiler',
      monto: 2800.00,
      fecha: new Date(y, m, 2),
      metodoPago: 'transferencia',
      referenciaComprobante: 'RECIBO-ALQ-102',
      observaciones: 'Mes corriente según contrato',
      usuarioId: admin.id
    },
    {
      descripcion: 'Anticipo Quincenal de Sueldo - Carlos Méndez',
      categoria: 'sueldos_salarios',
      monto: 1800.00,
      fecha: new Date(y, m, 14),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TRANSF-BNB-9912',
      empleadoId: mecanicoCarlos?.id || null,
      observaciones: 'Anticipo quincenal del 50%',
      usuarioId: admin.id
    },
    {
      descripcion: 'Lote de Insumos: Líquidos de Freno DOT4 y Desengrasantes',
      categoria: 'repuestos_insumos',
      monto: 620.00,
      fecha: new Date(y, m, 10),
      metodoPago: 'efectivo',
      referenciaComprobante: 'FACT-INS-4192',
      observaciones: 'Compra directa a distribuidora autorizada',
      usuarioId: admin.id
    },
    {
      descripcion: 'Calibración y Mantenimiento de Elevador Hidráulico #1',
      categoria: 'mantenimiento_taller',
      monto: 450.00,
      fecha: new Date(y, m, 12),
      metodoPago: 'efectivo',
      referenciaComprobante: 'REC-TEC-331',
      observaciones: 'Cambio de sellos hidráulicos y lubricación',
      usuarioId: admin.id
    }
  ];

  for (const eg of egresosData) {
    await prisma.egreso.create({ data: eg });
  }

  console.log(`✅ ${egresosData.length} egresos iniciales sembrados con éxito.`);
  process.exit(0);
}

seedEgresos().catch(e => {
  console.error(e);
  process.exit(1);
});
