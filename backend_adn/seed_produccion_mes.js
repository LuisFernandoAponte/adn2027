import prisma from './src/config/database.js';
import bcrypt from 'bcrypt';

async function seedMesProduccion() {
  console.log('🚀 Iniciando Simulación de Producción - Mes Completo ADN Motors (Bolivia)...');

  // 1. Obtener Roles
  const rolCliente = await prisma.rol.findFirst({ where: { descripcion: 'Cliente' } });
  const rolAdmin = await prisma.rol.findFirst({ where: { descripcion: 'Administrador' } });

  if (!rolCliente || !rolAdmin) {
    throw new Error('No se encontraron los roles básicos en la base de datos.');
  }

  // Usuario Admin para registrar eventos y facturas
  const adminUser = await prisma.usuario.findFirst({
    where: { rolId: rolAdmin.id }
  });
  const adminId = adminUser ? adminUser.id : 'bae14435-c319-43af-967c-61145465de5e';

  // 2. Obtener Mecánicos existentes
  const empleados = await prisma.empleado.findMany({
    include: { usuario: true }
  });

  const carlos = empleados.find(e => e.usuario.nombreCompleto.includes('Carlos')) || empleados[0];
  const maria = empleados.find(e => e.usuario.nombreCompleto.includes('María') || e.usuario.nombreCompleto.includes('Maria')) || empleados[1] || empleados[0];
  const pedro = empleados.find(e => e.usuario.nombreCompleto.includes('Pedro')) || empleados[2] || empleados[0];

  console.log('👨‍🔧 Mecánicos asignados:', {
    carlos: carlos?.usuario.nombreCompleto,
    maria: maria?.usuario.nombreCompleto,
    pedro: pedro?.usuario.nombreCompleto,
  });

  // 3. Crear Clientes Bolivianos Adicionales si no existen
  const passwordHash = await bcrypt.hash('cliente123', 10);
  const clientesData = [
    {
      nombreCompleto: 'Marcelo Quiroga Banzer',
      email: 'marcelo.quiroga@gmail.com',
      telefono: '+591 77012938',
      vehiculo: { marca: 'Toyota', modelo: 'Land Cruiser Prado VX', anio: 2021, placa: '3280-TLA', kilometraje: 54200 }
    },
    {
      nombreCompleto: 'Patricia Soliz Banzer',
      email: 'patricia.soliz@hotmail.com',
      telefono: '+591 71682940',
      vehiculo: { marca: 'Hyundai', modelo: 'Tucson 2.0 4WD', anio: 2022, placa: '4192-KLR', kilometraje: 28900 }
    },
    {
      nombreCompleto: 'Gonzalo Justiniano Torrico',
      email: 'gonzalo.justiniano@cotas.com.bo',
      telefono: '+591 76049281',
      vehiculo: { marca: 'Toyota', modelo: 'Corolla Cross 2.0', anio: 2023, placa: '5281-ZMN', kilometraje: 98400 }
    },
    {
      nombreCompleto: 'Valeria Torrez Morales',
      email: 'valeria.torrez@outlook.com',
      telefono: '+591 70839210',
      vehiculo: { marca: 'Suzuki', modelo: 'Swift GLX', anio: 2020, placa: '2849-VTL', kilometraje: 19800 }
    },
    {
      nombreCompleto: 'Diego Melgar Aguilera',
      email: 'diego.melgar@gmail.com',
      telefono: '+591 78591024',
      vehiculo: { marca: 'Nissan', modelo: 'Patrol GRX V8', anio: 2019, placa: '4920-DMG', kilometraje: 112000 }
    }
  ];

  for (const cData of clientesData) {
    let u = await prisma.usuario.findUnique({ where: { email: cData.email } });
    if (!u) {
      u = await prisma.usuario.create({
        data: {
          nombreCompleto: cData.nombreCompleto,
          email: cData.email,
          password: passwordHash,
          telefono: cData.telefono,
          rolId: rolCliente.id,
          estado: true,
          emailVerificado: true,
          cliente: {
            create: {
              vehiculos: {
                create: [cData.vehiculo]
              }
            }
          }
        }
      });
      console.log(`✅ Cliente creado: ${cData.nombreCompleto} (${cData.vehiculo.marca} ${cData.vehiculo.modelo} - ${cData.vehiculo.placa})`);
    }
  }

  // Cargar todos los clientes con sus vehículos
  const todosClientes = await prisma.cliente.findMany({
    include: { usuario: true, vehiculos: true }
  });

  // Cargar Servicios e Inventario
  const todosServicios = await prisma.servicio.findMany();
  const servMap = {};
  todosServicios.forEach(s => { servMap[s.descripcion] = s; });

  const todosInventario = await prisma.inventario.findMany();
  const invMap = {};
  todosInventario.forEach(i => { invMap[i.nombre] = i; });

  console.log(`📦 Servicios disponibles: ${todosServicios.length}, Repuestos en inventario: ${todosInventario.length}`);

  // 4. Limpiar órdenes y facturas anteriores de prueba (opcional/seguro para evitar duplicados en seed)
  console.log('🧹 Sincronizando órdenes de trabajo del mes de Octubre 2026...');

  // Definición de las 20 Órdenes de Trabajo del Mes de Octubre 2026
  const ordenesMes = [
    {
      clienteNombre: 'Juan Pérez',
      empleado: carlos,
      fechaStr: '2026-10-02',
      horaInicio: '08:30',
      horaFin: '11:45',
      estado: 'Entregado',
      km: 68420,
      tipoServicio: 'mantenimiento',
      servicios: ['Mantenimiento general', 'Cambio de aceite'],
      repuestos: [{ nombre: 'Filtro de aceite', cant: 1 }, { nombre: 'Aceite 20W50 galón', cant: 1 }],
      obs: 'Mantenimiento preventivo programado de 70.000 km.',
      diag: 'Cambio de fluidos y filtros completado. Niveles de refrigerante y frenos inspeccionados OK.',
      facturaNum: 'FAC-2026-003',
      descuento: 0
    },
    {
      clienteNombre: 'Ana Rodríguez',
      empleado: maria,
      fechaStr: '2026-10-04',
      horaInicio: '09:00',
      horaFin: '13:00',
      estado: 'Entregado',
      km: 45190,
      tipoServicio: 'reparacion',
      servicios: ['Mantenimiento de frenos'],
      repuestos: [{ nombre: 'Pastillas de freno delanteras', cant: 1 }, { nombre: 'Líquido de frenos DOT4', cant: 1 }],
      obs: 'Chirrido agudo al frenar en bajada.',
      diag: 'Pastillas delanteras desgastadas al 10%. Se reemplazaron y se purgó circuito de frenos.',
      facturaNum: 'FAC-2026-004',
      descuento: 0
    },
    {
      clienteNombre: 'Roberto Quispe',
      empleado: pedro,
      fechaStr: '2026-10-06',
      horaInicio: '10:00',
      horaFin: '12:30',
      estado: 'Entregado',
      km: 32400,
      tipoServicio: 'mantenimiento',
      servicios: ['Alineación y balanceo', 'Diagnóstico computarizado'],
      repuestos: [],
      obs: 'Vibración en volante superando los 80 km/h en carretera.',
      diag: 'Alineación computarizada 3D realizada. Plomos de balanceo colocados en 4 ruedas.',
      facturaNum: 'FAC-2026-005',
      descuento: 0
    },
    {
      clienteNombre: 'Carmen Flores',
      empleado: maria,
      fechaStr: '2026-10-08',
      horaInicio: '08:00',
      horaFin: '14:00',
      estado: 'Entregado',
      km: 89310,
      tipoServicio: 'reparacion',
      servicios: ['Cambio de amortiguadores'],
      repuestos: [{ nombre: 'Amortiguadores delanteros', cant: 2 }, { nombre: 'Rótulas de dirección', cant: 1 }],
      obs: 'Golpeteo seco al pasar rompemuelles.',
      diag: 'Amortiguadores delanteros reventados con fuga hidráulica. Reemplazados con garantía de 12 meses.',
      facturaNum: 'FAC-2026-006',
      descuento: 50
    },
    {
      clienteNombre: 'Marcelo Quiroga Banzer',
      empleado: carlos,
      fechaStr: '2026-10-10',
      horaInicio: '09:30',
      horaFin: '15:30',
      estado: 'Entregado',
      km: 54200,
      tipoServicio: 'mantenimiento',
      servicios: ['Mantenimiento general', 'Cambio de aceite'],
      repuestos: [{ nombre: 'Filtro de aire', cant: 1 }, { nombre: 'Filtro de aceite', cant: 1 }, { nombre: 'Bujías NGK (juego 4)', cant: 1 }],
      obs: 'Pérdida de potencia en subidas hacia Samaipata.',
      diag: 'Bujías carbonizadas y filtro de aire saturado. Se instalaron bujías japonesas NGK y filtro genuino.',
      facturaNum: 'FAC-2026-007',
      descuento: 0
    },
    {
      clienteNombre: 'Patricia Soliz Banzer',
      empleado: pedro,
      fechaStr: '2026-10-12',
      horaInicio: '11:00',
      horaFin: '13:30',
      estado: 'Entregado',
      km: 28900,
      tipoServicio: 'reparacion',
      servicios: ['Sistema de frenos'],
      repuestos: [{ nombre: 'Discos de freno traseros', cant: 1 }, { nombre: 'Líquido de frenos DOT4', cant: 1 }],
      obs: 'Pedal de freno con recorrido esponjoso.',
      diag: 'Discos traseros rectificados y purga de burbujas en bomba maestra ABS.',
      facturaNum: 'FAC-2026-008',
      descuento: 0
    },
    {
      clienteNombre: 'Gonzalo Justiniano Torrico',
      empleado: maria,
      fechaStr: '2026-10-14',
      horaInicio: '08:30',
      horaFin: '16:00',
      estado: 'Entregado',
      km: 98400,
      tipoServicio: 'reparacion',
      servicios: ['Reparación de motor', 'Diagnóstico computarizado'],
      repuestos: [{ nombre: 'Correa de distribución', cant: 1 }, { nombre: 'Refrigerante 50/50 galón', cant: 1 }],
      obs: 'Testigo Check Engine intermitente y sonido metálico de correa.',
      diag: 'Sincronización de punto de distribución y cambio de polea tensora. Scanner OBD2 reseteado sin códigos.',
      facturaNum: 'FAC-2026-009',
      descuento: 100
    },
    {
      clienteNombre: 'Valeria Torrez Morales',
      empleado: carlos,
      fechaStr: '2026-10-16',
      horaInicio: '14:00',
      horaFin: '16:30',
      estado: 'Entregado',
      km: 19800,
      tipoServicio: 'mantenimiento',
      servicios: ['Cambio de aceite'],
      repuestos: [{ nombre: 'Filtro de aceite', cant: 1 }, { nombre: 'Aceite 20W50 galón', cant: 1 }],
      obs: 'Mantenimiento de 20.000 km según manual de garantía.',
      diag: 'Cambio de aceite y filtro completado. Inspección de suspensión y presión de llantas en 32 PSI.',
      facturaNum: 'FAC-2026-010',
      descuento: 0
    },
    {
      clienteNombre: 'Diego Melgar Aguilera',
      empleado: pedro,
      fechaStr: '2026-10-18',
      horaInicio: '09:00',
      horaFin: '14:30',
      estado: 'Entregado',
      km: 112000,
      tipoServicio: 'reparacion',
      servicios: ['Diagnóstico eléctrico'],
      repuestos: [{ nombre: 'Batería 12V 70Ah', cant: 1 }, { nombre: 'Faros delanteros LED', cant: 1 }],
      obs: 'Falla de arranque en frío y luz tenue delantera derecha.',
      diag: 'Batería con celdas sulfatadas de 4 años de uso. Reemplazada por batería sellada 70Ah libre de mantenimiento.',
      facturaNum: 'FAC-2026-011',
      descuento: 0
    },
    {
      clienteNombre: 'fernando aponte',
      empleado: maria,
      fechaStr: '2026-10-20',
      horaInicio: '08:30',
      horaFin: '15:00',
      estado: 'Entregado',
      km: 38200,
      tipoServicio: 'mantenimiento',
      servicios: ['Alineación y balanceo', 'Mantenimiento general'],
      repuestos: [{ nombre: 'Aceite de transmisión ATF', cant: 1 }, { nombre: 'Líquido de frenos DOT4', cant: 1 }],
      obs: 'Mantenimiento preventivo para viaje de expedición.',
      diag: 'Fluidos de caja y diferenciales renovados. Balanceo de 4 neumáticos todo terreno 285/70R17.',
      facturaNum: 'FAC-2026-012',
      descuento: 0
    },
    {
      clienteNombre: 'Juan Pérez',
      empleado: carlos,
      fechaStr: '2026-10-22',
      horaInicio: '10:00',
      horaFin: '13:00',
      estado: 'Completado',
      km: 71200,
      tipoServicio: 'reparacion',
      servicios: ['Mantenimiento de frenos', 'Alineación y balanceo'],
      repuestos: [{ nombre: 'Pastillas de freno delanteras', cant: 1 }],
      obs: 'Inspección previa a viaje de trabajo.',
      diag: 'Frenos delanteros renovados. Calibración y alineación en banco láser.',
      facturaNum: 'FAC-2026-013',
      descuento: 0
    },
    // ÓRDENES ACTIVAS EN TALLER HOY (24 AL 28 DE OCTUBRE)
    {
      clienteNombre: 'Marcelo Quiroga Banzer',
      empleado: carlos,
      fechaStr: '2026-10-25',
      horaInicio: '08:30',
      horaFin: null,
      estado: 'En_progreso',
      km: 56100,
      tipoServicio: 'reparacion',
      servicios: ['Reparación de motor'],
      repuestos: [{ nombre: 'Correa de distribución', cant: 1 }],
      obs: 'Desmontaje de culata y calibración de inyectores common rail.',
      diag: 'En desarme de tapa de válvulas. Esperando rectificación de asiento de árbol de levas.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Patricia Soliz Banzer',
      empleado: pedro,
      fechaStr: '2026-10-26',
      horaInicio: '09:00',
      horaFin: null,
      estado: 'En_progreso',
      km: 30100,
      tipoServicio: 'reparacion',
      servicios: ['Cambio de amortiguadores'],
      repuestos: [{ nombre: 'Amortiguadores delanteros', cant: 1 }],
      obs: 'Cambio de cazoletas y amortiguadores en tren delantero.',
      diag: 'Amortiguador derecho desmontado. En proceso de compresión de espiral.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Gonzalo Justiniano Torrico',
      empleado: maria,
      fechaStr: '2026-10-26',
      horaInicio: '14:00',
      horaFin: null,
      estado: 'En_progreso',
      km: 101200,
      tipoServicio: 'mantenimiento',
      servicios: ['Mantenimiento general'],
      repuestos: [{ nombre: 'Filtro de aire', cant: 1 }, { nombre: 'Filtro de aceite', cant: 1 }],
      obs: 'Servicio mayor y diagnóstico electrónico completo.',
      diag: 'Mantenimiento en ejecución en Bahía 2.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Valeria Torrez Morales',
      empleado: maria,
      fechaStr: '2026-10-27',
      horaInicio: '08:30',
      horaFin: null,
      estado: 'En_revision',
      km: 21400,
      tipoServicio: 'revision',
      servicios: ['Diagnóstico computarizado'],
      repuestos: [],
      obs: 'Luz de ABS encendida tras pasar bache con agua.',
      diag: 'Conectando escáner Autel Maxisys para lectura de sensores de rueda.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Diego Melgar Aguilera',
      empleado: carlos,
      fechaStr: '2026-10-27',
      horaInicio: '10:30',
      horaFin: null,
      estado: 'En_taller',
      km: 114500,
      tipoServicio: 'reparacion',
      servicios: ['Diagnóstico eléctrico'],
      repuestos: [],
      obs: 'Ingreso al taller. Pérdida de carga del alternador.',
      diag: 'Vehículo recibido en patio. Asignado a Carlos Méndez.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Ana Rodríguez',
      empleado: pedro,
      fechaStr: '2026-10-28',
      horaInicio: '08:30',
      horaFin: null,
      estado: 'Agendado',
      km: 47000,
      tipoServicio: 'mantenimiento',
      servicios: ['Alineación y balanceo'],
      repuestos: [],
      obs: 'Cita programada confirmada vía WhatsApp.',
      diag: 'Cita agendada.',
      facturaNum: null,
      descuento: 0
    },
    {
      clienteNombre: 'Carmen Flores',
      empleado: carlos,
      fechaStr: '2026-10-29',
      horaInicio: '10:00',
      horaFin: null,
      estado: 'Agendado',
      km: 91500,
      tipoServicio: 'mantenimiento',
      servicios: ['Mantenimiento general'],
      repuestos: [],
      obs: 'Inspección de viaje a Chiquitanía.',
      diag: 'Cita agendada.',
      facturaNum: null,
      descuento: 0
    }
  ];

  let citasCreadasCount = 0;
  let facturasCreadasCount = 0;
  let totalFacturado = 0;

  for (const ord of ordenesMes) {
    const clienteObj = todosClientes.find(c => c.usuario.nombreCompleto === ord.clienteNombre) || todosClientes[0];
    if (!clienteObj) continue;

    // Verificar si ya existe cita para ese cliente en esa fecha para evitar duplicar
    const fechaCitaDate = new Date(`${ord.fechaStr}T00:00:00.000Z`);
    const horaInicioDate = new Date(`${ord.fechaStr}T${ord.horaInicio}:00.000Z`);
    const horaFinDate = ord.horaFin ? new Date(`${ord.fechaStr}T${ord.horaFin}:00.000Z`) : null;

    // Calcular costos de servicios y repuestos
    const serviciosConectados = ord.servicios.map(sNom => servMap[sNom]).filter(Boolean);
    const subtotalServicios = serviciosConectados.reduce((acc, s) => acc + Number(s.costo), 0);

    const repuestosItems = ord.repuestos.map(r => {
      const inv = invMap[r.nombre];
      if (!inv) return null;
      const unit = Number(inv.precioVenta || 100);
      const sub = unit * r.cant;
      return {
        inventarioId: inv.id,
        cantidad: r.cant,
        precioUnitario: unit,
        subtotal: sub,
        instalado: true
      };
    }).filter(Boolean);

    const subtotalRepuestos = repuestosItems.reduce((acc, r) => acc + r.subtotal, 0);
    const totalOrden = Math.max(0, subtotalServicios + subtotalRepuestos - ord.descuento);

    const mapTipoServicio = (tipo) => {
      if (tipo === 'reparacion') return 'reparacion';
      if (tipo === 'revision') return 'revision';
      return 'ambos';
    };

    // Crear Cita
    const nuevaCita = await prisma.cita.create({
      data: {
        fechaCita: fechaCitaDate,
        horaInicio: horaInicioDate,
        horaFin: horaFinDate,
        clienteId: clienteObj.id,
        empleadoId: ord.empleado.id,
        estado: ord.estado,
        tipoServicio: mapTipoServicio(ord.tipoServicio),
        observaciones: ord.obs,
        diagnostico: ord.diag,
        kilometraje: ord.km,
        descuento: ord.descuento,
        fechaEstimadaEntrega: new Date(`${ord.fechaStr}T17:00:00.000Z`),
        fechaEntregaReal: ord.estado === 'Entregado' ? horaFinDate || new Date(`${ord.fechaStr}T17:00:00.000Z`) : null,
        detalleServicios: {
          create: serviciosConectados.map(s => ({ servicioId: s.id }))
        },
        citasRepuestos: {
          create: repuestosItems
        },
        estadosTrabajo: {
          create: [
            { estado: 'Agendado', observaciones: 'Cita ingresada en sistema', usuarioId: adminId, fechaCambio: fechaCitaDate },
            ...(ord.estado !== 'Agendado' ? [{ estado: 'En_taller', observaciones: 'Vehículo recibido en taller', usuarioId: adminId, fechaCambio: horaInicioDate }] : []),
            ...(ord.estado === 'En_revision' || ord.estado === 'En_progreso' || ord.estado === 'Completado' || ord.estado === 'Entregado' ? [{ estado: 'En_revision', observaciones: 'Diagnóstico e inspección completada', usuarioId: ord.empleado.usuarioId, fechaCambio: horaInicioDate }] : []),
            ...(ord.estado === 'En_progreso' || ord.estado === 'Completado' || ord.estado === 'Entregado' ? [{ estado: 'En_progreso', observaciones: 'Trabajos y repuestos en ejecución', usuarioId: ord.empleado.usuarioId, fechaCambio: horaInicioDate }] : []),
            ...(ord.estado === 'Completado' || ord.estado === 'Entregado' ? [{ estado: 'Completado', observaciones: 'Prueba de ruta finalizada OK. Listo para entrega.', usuarioId: ord.empleado.usuarioId, fechaCambio: horaFinDate || new Date() }] : []),
            ...(ord.estado === 'Entregado' ? [{ estado: 'Entregado', observaciones: 'Vehículo entregado a satisfacción del cliente.', usuarioId: adminId, fechaCambio: horaFinDate || new Date() }] : [])
          ]
        }
      }
    });

    citasCreadasCount++;

    // Crear Factura si la orden fue completada/entregada y tiene número de factura
    if (ord.facturaNum && (ord.estado === 'Entregado' || ord.estado === 'Completado')) {
      // Verificar si ya existe número de factura
      const existeFac = await prisma.factura.findUnique({ where: { numeroFactura: ord.facturaNum } });
      if (!existeFac) {
        await prisma.factura.create({
          data: {
            numeroFactura: ord.facturaNum,
            citaId: nuevaCita.id,
            clienteId: clienteObj.id,
            usuarioId: adminId,
            fechaEmision: new Date(`${ord.fechaStr}T16:00:00.000Z`),
            total: totalOrden,
            estado: 'emitida'
          }
        });
        facturasCreadasCount++;
        totalFacturado += totalOrden;
      }
    }
  }

  console.log(`✅ Citas creadas: ${citasCreadasCount}, Facturas emitidas: ${facturasCreadasCount}, Total Facturado: Bs ${totalFacturado.toFixed(2)}`);

  // 5. Crear Egresos Operativos Completos del Mes (Sueldos, Alquiler, Luz, Agua, Insumos)
  console.log('💳 Registrando Egresos y Gastos Operativos de Octubre 2026...');

  const egresosMesData = [
    {
      descripcion: 'Alquiler Mensual del Galpón y Parqueo de Clientes (Octubre)',
      categoria: 'alquiler',
      monto: 3500.00,
      fecha: new Date('2026-10-02T09:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'INMOB-ALQ-OCT26',
      observaciones: 'Pago mensual según contrato de arrendamiento comercial.'
    },
    {
      descripcion: 'Factura CRE - Electricidad Trifásica (Compresores y Elevadores)',
      categoria: 'servicios_basicos',
      monto: 850.00,
      fecha: new Date('2026-10-05T10:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'CRE-FACT-992102',
      observaciones: 'Consumo por uso continuo de puente elevador y compresor de aire.'
    },
    {
      descripcion: 'Factura SAGUAPAC - Agua Potable y Fosa de Lavado',
      categoria: 'servicios_basicos',
      monto: 180.00,
      fecha: new Date('2026-10-06T11:00:00.000Z'),
      metodoPago: 'efectivo',
      referenciaComprobante: 'SAG-FACT-40291',
      observaciones: 'Lavado de chasis, bloques y radiadores.'
    },
    {
      descripcion: 'Tigo Business - Internet Fibra Óptica 300 Mbps',
      categoria: 'servicios_basicos',
      monto: 290.00,
      fecha: new Date('2026-10-08T15:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TIGO-FIBRA-8821',
      observaciones: 'Conexión para telemetría, escáneres OBD2 y sistema web.'
    },
    {
      descripcion: 'Compra Lote de Insumos: Aceites Sintéticos y Líquidos de Freno',
      categoria: 'repuestos_insumos',
      monto: 1450.00,
      fecha: new Date('2026-10-10T12:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'FACT-DISTRIB-4821',
      observaciones: 'Adquisición al por mayor de 3 cajas de líquido de freno y galones de aceite.'
    },
    {
      descripcion: 'Mantenimiento Preventivo y Cambio de Sellos Elevador #1',
      categoria: 'mantenimiento_taller',
      monto: 450.00,
      fecha: new Date('2026-10-12T16:00:00.000Z'),
      metodoPago: 'efectivo',
      referenciaComprobante: 'RECIBO-TEC-HYDR-12',
      observaciones: 'Calibración de seguridad y cambio de aceite hidráulico ISO 68.'
    },
    // SUELDOS Y ADELANTOS DE MECÁNICOS (QUINCENA 15 DE OCTUBRE)
    {
      descripcion: 'Sueldo Quincenal - Carlos Méndez (Mecánico Jefe)',
      categoria: 'sueldos_salarios',
      monto: 2100.00,
      fecha: new Date('2026-10-15T14:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TRANSF-BNB-CARLOS-Q1',
      empleadoId: carlos.id,
      observaciones: 'Anticipo quincenal del 50% de salario base.'
    },
    {
      descripcion: 'Sueldo Quincenal - María López (Mecánica Especialista)',
      categoria: 'sueldos_salarios',
      monto: 1900.00,
      fecha: new Date('2026-10-15T14:15:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TRANSF-BNB-MARIA-Q1',
      empleadoId: maria.id,
      observaciones: 'Anticipo quincenal del 50% de salario base.'
    },
    {
      descripcion: 'Sueldo Quincenal - Pedro Romero (Mecánico de Bahía)',
      categoria: 'sueldos_salarios',
      monto: 1600.00,
      fecha: new Date('2026-10-15T14:30:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TRANSF-BNB-PEDRO-Q1',
      empleadoId: pedro.id,
      observaciones: 'Anticipo quincenal del 50% de salario base.'
    },
    {
      descripcion: 'Sueldo Quincenal - Ana Vargas (Recepción y Facturación)',
      categoria: 'sueldos_salarios',
      monto: 1300.00,
      fecha: new Date('2026-10-15T14:45:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'TRANSF-BNB-ANA-Q1',
      observaciones: 'Anticipo quincenal del 50% de salario base.'
    },
    {
      descripcion: 'Reposición Stock: Filtros de Aire, Aceite y Bujías NGK',
      categoria: 'repuestos_insumos',
      monto: 2100.00,
      fecha: new Date('2026-10-18T11:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'FACT-IMPORT-JAPON-391',
      observaciones: 'Compra directa a importadora para mantener stock mínimo.'
    },
    {
      descripcion: 'Asesoría Contable Mensual y Declaración Formulario 200/400 SIN',
      categoria: 'impuestos_legales',
      monto: 600.00,
      fecha: new Date('2026-10-20T10:00:00.000Z'),
      metodoPago: 'transferencia',
      referenciaComprobante: 'HONORARIOS-CONT-881',
      observaciones: 'Cierre fiscal y declaración mensual de impuestos.'
    },
    {
      descripcion: 'Bono de Productividad por Cumplimiento de OTs - Carlos Méndez',
      categoria: 'sueldos_salarios',
      monto: 500.00,
      fecha: new Date('2026-10-25T17:00:00.000Z'),
      metodoPago: 'efectivo',
      referenciaComprobante: 'RECIBO-BONO-CARLOS',
      empleadoId: carlos.id,
      observaciones: 'Bono acordado por superar meta de 8 órdenes completadas a tiempo.'
    },
    {
      descripcion: 'Bono de Productividad en Bahía - María López',
      categoria: 'sueldos_salarios',
      monto: 450.00,
      fecha: new Date('2026-10-25T17:15:00.000Z'),
      metodoPago: 'efectivo',
      referenciaComprobante: 'RECIBO-BONO-MARIA',
      empleadoId: maria.id,
      observaciones: 'Bono por mayor facturación en reparación de motores.'
    },
    {
      descripcion: 'Caja Chica: Insumos de Limpieza, Franelas y Desengrasante de Manos',
      categoria: 'otros',
      monto: 220.00,
      fecha: new Date('2026-10-26T12:00:00.000Z'),
      metodoPago: 'efectivo',
      referenciaComprobante: 'CAJA-CHICA-OCT-02',
      observaciones: 'Jabón industrial de mecánicos y trapos para limpieza de herramientas.'
    }
  ];

  let egresosCreados = 0;
  let totalEgresos = 0;

  for (const eg of egresosMesData) {
    const existe = await prisma.egreso.findFirst({
      where: {
        descripcion: eg.descripcion,
        fecha: eg.fecha
      }
    });

    if (!existe) {
      await prisma.egreso.create({
        data: {
          descripcion: eg.descripcion,
          categoria: eg.categoria,
          monto: eg.monto,
          fecha: eg.fecha,
          metodoPago: eg.metodoPago,
          referenciaComprobante: eg.referenciaComprobante,
          observaciones: eg.observaciones,
          empleadoId: eg.empleadoId || null,
          usuarioId: adminId
        }
      });
      egresosCreados++;
      totalEgresos += eg.monto;
    }
  }

  console.log(`✅ Egresos creados: ${egresosCreados}, Total Gastos de Octubre: Bs ${totalEgresos.toFixed(2)}`);

  console.log('🎉 Simulación de mes completo completada con éxito.');
  console.log('----------------------------------------------------');
  console.log(`📊 BALANCE FINAL SIMULADO:`);
  console.log(`- Facturación Estimada: Bs ${totalFacturado.toFixed(2)}`);
  console.log(`- Gastos Operativos:    Bs ${totalEgresos.toFixed(2)}`);
  console.log(`- Utilidad Neta:        Bs ${(totalFacturado - totalEgresos).toFixed(2)}`);
  console.log('----------------------------------------------------');
}

seedMesProduccion()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
