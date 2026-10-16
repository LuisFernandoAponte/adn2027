import prisma from './src/config/database.js';
import { getHistorialClinico, getMantenimientosPreventivos, getVehiculos } from './src/controllers/vehiculo.controller.js';

async function testAll() {
  console.log('=== INICIANDO PRUEBAS SENIOR DE INTEGRACION (PASOS 3, 4 Y MODULO 5) ===\n');

  // 1. Test Vehiculos DB
  console.log('1. Verificando tabla vehiculos en Supabase / Prisma:');
  const count = await prisma.vehiculo.count();
  console.log(`   -> Total vehiculos registrados en BD: ${count}`);
  const vList = await prisma.vehiculo.findMany({ take: 3, include: { cliente: { include: { usuario: true } } } });
  vList.forEach(v => {
    console.log(`   * Placa: [${v.placa}] | ${v.marca} ${v.modelo} (${v.anio}) | Propietario: ${v.cliente?.usuario?.nombreCompleto || 'Sin nombre'}`);
  });

  // 2. Test Controller getHistorialClinico (Carfax del Taller)
  console.log('\n2. Probando getHistorialClinico con placa 4829-KLS:');
  const mockReqCarfax = { params: { placa: '4829-KLS' } };
  let carfaxResult = null;
  const mockResCarfax = {
    status: (code) => ({
      json: (data) => {
        carfaxResult = { code, data };
        return data;
      }
    }),
    json: (data) => {
      carfaxResult = { code: 200, data };
      return data;
    }
  };

  await getHistorialClinico(mockReqCarfax, mockResCarfax);
  if (carfaxResult && carfaxResult.code === 200 && carfaxResult.data.success) {
    const d = carfaxResult.data;
    console.log(`   ✓ Carfax cargado con éxito!`);
    console.log(`     - Vehículo: ${d.vehiculo.marca} ${d.vehiculo.modelo} (${d.vehiculo.placa})`);
    console.log(`     - Propietario: ${d.vehiculo.cliente} (${d.vehiculo.telefono})`);
    console.log(`     - Total Visitas / OTs: ${d.resumen_clinico.total_visitas}`);
    console.log(`     - Inversión Total Histórica: Bs. ${d.resumen_clinico.total_invertido_bob}`);
    console.log(`     - Garantías Activas (90 días): ${d.garantias_vigentes.length}`);
    console.log(`     - Puntos en Curva de Kilometraje: ${d.curva_kilometraje.length}`);
    console.log(`     - Próximo Servicio Aceite: ${d.mantenimiento_predictivo.proximo_cambio_aceite_km} km`);
  } else {
    console.error('   ❌ Error al obtener Carfax:', carfaxResult);
    process.exit(1);
  }

  // 3. Test Controller getMantenimientosPreventivos (Módulo 5 Predictivo)
  console.log('\n3. Probando getMantenimientosPreventivos (Retención y Predicción):');
  const mockReqPrev = { query: {} };
  let prevResult = null;
  const mockResPrev = {
    status: (code) => ({
      json: (data) => {
        prevResult = { code, data };
        return data;
      }
    }),
    json: (data) => {
      prevResult = { code: 200, data };
      return data;
    }
  };

  await getMantenimientosPreventivos(mockReqPrev, mockResPrev);
  if (prevResult && prevResult.code === 200 && prevResult.data.success) {
    const d = prevResult.data;
    console.log(`   ✓ Predicción y Retención ejecutada con éxito!`);
    console.log(`     - Total vehículos monitoreados: ${d.metricas.total_vehiculos_monitoreados}`);
    console.log(`     - Mantenimientos Vencidos (Urgencia Alta): ${d.metricas.vencidos_urgentes}`);
    console.log(`     - Mantenimientos Próximos (Alerta este mes): ${d.metricas.proximos_este_mes}`);
    console.log(`     - Mantenimientos Al Día: ${d.metricas.al_dia}`);
    console.log('\n     Muestra de mantenimientos calculados para el taller:');
    d.vehiculos.slice(0, 4).forEach(a => {
      console.log(`       [${a.urgencia}] ${a.placa} (${a.vehiculo}) -> Recomendado: "${a.servicio_recomendado}" | Último servicio: ${a.dias_desde_ultimo_servicio} días atrás`);
    });
  } else {
    console.error('   ❌ Error en Mantenimiento Preventivo:', prevResult);
    process.exit(1);
  }

  console.log('\n=== TODAS LAS PRUEBAS DE INTEGRACION DE CONTROLADORES Y BD HAN SIDO EXITOSAS (100% OK) ===');
  await prisma.$disconnect();
}

testAll().catch(e => {
  console.error('Error durante test:', e);
  process.exit(1);
});
