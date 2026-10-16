import prisma from '../src/config/database.js';

async function seedVehiculos() {
  console.log('--- Sembrando Vehículos Oficiales ADN Motors ---');

  const clientes = await prisma.cliente.findMany({
    include: { usuario: true }
  });

  if (clientes.length === 0) {
    console.log('No hay clientes registrados.');
    return;
  }

  const VEHICULOS_DATA = [
    { marca: 'Toyota', modelo: 'Hilux 4x4 D-4D', anio: 2023, placa: '4829-KLS', kilometraje: 45200 },
    { marca: 'Nissan', modelo: 'Frontier PRO-4X', anio: 2022, placa: '3921-XYZ', kilometraje: 38100 },
    { marca: 'Suzuki', modelo: 'Grand Vitara AllGrip', anio: 2021, placa: '5102-ABC', kilometraje: 52400 },
    { marca: 'Mitsubishi', modelo: 'L200 Triton GLS', anio: 2023, placa: '2841-MNO', kilometraje: 29000 },
    { marca: 'Ford', modelo: 'Ranger Raptor V6 Bi-Turbo', anio: 2024, placa: '6039-PQR', kilometraje: 15800 },
    { marca: 'Chevrolet', modelo: 'Colorado High Country', anio: 2022, placa: '1948-DFG', kilometraje: 41200 },
  ];

  for (let i = 0; i < clientes.length && i < VEHICULOS_DATA.length; i++) {
    const c = clientes[i];
    const vData = VEHICULOS_DATA[i];

    const existing = await prisma.vehiculo.findUnique({
      where: { placa: vData.placa }
    });

    if (!existing) {
      const v = await prisma.vehiculo.create({
        data: {
          marca: vData.marca,
          modelo: vData.modelo,
          anio: vData.anio,
          placa: vData.placa,
          kilometraje: vData.kilometraje,
          clienteId: c.id,
          estado: true,
        }
      });
      console.log(`Vehículo registrado: ${v.marca} ${v.modelo} [${v.placa}] -> Cliente: ${c.usuario?.nombreCompleto}`);
    } else {
      console.log(`Vehículo ya existente: [${existing.placa}]`);
    }
  }

  console.log('¡Vehículos sembrados exitosamente!');
}

seedVehiculos()
  .catch((e) => {
    console.error('Error al sembrar vehículos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
