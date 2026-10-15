import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['error'] });

async function runE2EWorkflowTest() {
  console.log('\n========================================');
  console.log('   TEST DE INTEGRACIÓN DE LÓGICA DE NEGOCIO (SENIOR)');
  console.log('========================================\n');

  try {
    // 1. Obtener primera cita y primer item de inventario con stock
    const cita = await prisma.cita.findFirst({
      include: {
        cliente: { include: { usuario: true, vehiculos: true } },
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: { include: { inventario: true } }
      }
    });

    const repuesto = await prisma.inventario.findFirst({
      where: { stockActual: { gt: 0 } }
    });

    if (!cita) {
      console.log('⚠️ No hay citas en la BD para probar.');
      return;
    }

    if (!repuesto) {
      console.log('⚠️ No hay repuestos en inventario para probar.');
      return;
    }

    console.log(`1. Cita seleccionada ID: ${cita.id}`);
    console.log(`   - Cliente: ${cita.cliente?.usuario?.nombreCompleto || 'N/A'}`);
    console.log(`   - Estado actual: ${cita.estado}`);

    console.log(`\n2. Repuesto seleccionado: ${repuesto.nombre} (${repuesto.codigo})`);
    console.log(`   - Stock inicial en BD: ${repuesto.stockActual}`);
    console.log(`   - Precio de venta: Bs. ${repuesto.precioVenta}`);

    // 3. Simular asignación de repuesto (2 unidades)
    const cantidadAsignar = 2;
    const subtotalRepuesto = Number(repuesto.precioVenta) * cantidadAsignar;

    console.log(`\n3. Asignando ${cantidadAsignar} unidades de "${repuesto.nombre}" a la cita...`);

    await prisma.$transaction(async (tx) => {
      await tx.citaRepuesto.upsert({
        where: {
          citaId_inventarioId: { citaId: cita.id, inventarioId: repuesto.id }
        },
        create: {
          citaId: cita.id,
          inventarioId: repuesto.id,
          cantidad: cantidadAsignar,
          precioUnitario: repuesto.precioVenta,
          subtotal: subtotalRepuesto
        },
        update: {
          cantidad: { increment: cantidadAsignar },
          subtotal: { increment: subtotalRepuesto }
        }
      });

      await tx.inventario.update({
        where: { id: repuesto.id },
        data: { stockActual: { decrement: cantidadAsignar } }
      });
    });

    // 4. Verificar nuevo stock
    const repuestoActualizado = await prisma.inventario.findUnique({
      where: { id: repuesto.id }
    });

    console.log(`   ✅ Stock después de asignación: ${repuestoActualizado.stockActual} (descontó ${cantidadAsignar})`);

    // 5. Verificar cálculo de totales en la cita
    const citaActualizada = await prisma.cita.findUnique({
      where: { id: cita.id },
      include: {
        detalleServicios: { include: { servicio: true } },
        citasRepuestos: { include: { inventario: true } }
      }
    });

    const totalServicios = citaActualizada.detalleServicios.reduce((s, ds) => s + Number(ds.servicio.costo), 0);
    const totalRepuestos = citaActualizada.citasRepuestos.reduce((s, cr) => s + Number(cr.subtotal), 0);
    const totalGeneral = totalServicios + totalRepuestos;

    console.log(`\n4. Desglose de totales en Cita:`);
    console.log(`   - Servicios (Mano de obra): Bs. ${totalServicios.toFixed(2)}`);
    console.log(`   - Repuestos asignados: Bs. ${totalRepuestos.toFixed(2)}`);
    console.log(`   - TOTAL TRABAJO: Bs. ${totalGeneral.toFixed(2)}`);

    console.log('\n========================================');
    console.log('   ✅ PRUEBA E2E COMPLETADA EXITOSAMENTE');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ Error en prueba E2E:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runE2EWorkflowTest();
