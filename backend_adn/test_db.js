import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['query', 'error', 'warn'] });

async function testConnection() {
  console.log('\n========================================');
  console.log('   TEST DE CONEXIÓN A BASE DE DATOS');
  console.log('   ADN Motors - PostgreSQL');
  console.log('========================================\n');

  try {
    // 1. Conexión básica
    console.log('1. Probando conexión a PostgreSQL...');
    await prisma.$connect();
    console.log('   ✅ Conexión exitosa a PostgreSQL');

    // 2. Verificar tablas
    console.log('\n2. Verificando tablas en la base de datos...');
    const tables = [
      'rol', 'permisos', 'detalle_permiso',
      'usuario', 'cliente', 'empleado',
      'horarios_empleado', 'servicios',
      'citas', 'detalle_servicio',
      'factura', 'detalle_factura',
      'estado_trabajo', 'notificaciones',
      'pre_reserva', 'vehiculos'
    ];

    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`   ✅ Tabla "${table}" existe (${result[0]?.count || 0} registros)`);
      } catch (e) {
        console.log(`   ❌ Tabla "${table}" NO existe`);
      }
    }

    // 3. Contar registros en tablas principales
    console.log('\n3. Resumen de registros por tabla:');
    const counts = {
      'Roles (rol)': await prisma.rol.count(),
      'Usuarios': await prisma.usuario.count(),
      'Clientes': await prisma.cliente.count(),
      'Empleados': await prisma.empleado.count(),
      'Servicios': await prisma.servicio.count(),
      'Citas': await prisma.cita.count(),
      'Facturas': await prisma.factura.count(),
      'Vehículos': await prisma.vehiculo.count(),
      'Pre-reservas': await prisma.preReserva.count(),
      'Notificaciones': await prisma.notificacion.count(),
    };

    for (const [name, count] of Object.entries(counts)) {
      console.log(`   - ${name}: ${count}`);
    }

    console.log('\n========================================');
    console.log('   ✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('   Base de datos conectada y operativa');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN:');
    console.error(error.message);
    console.error('\nVerifica que:');
    console.error('  - PostgreSQL esté corriendo');
    console.error('  - La base de datos "adn_motors" exista en pgAdmin');
    console.error('  - Las credenciales en .env sean correctas');
    console.error('  - El puerto 5432 esté accesible\n');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
