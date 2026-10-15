import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // ==================== ROLES ====================
  const rolAdmin = await prisma.rol.upsert({
    where: { descripcion: 'Administrador' },
    update: {},
    create: { descripcion: 'Administrador' }
  });

  const rolEmpleado = await prisma.rol.upsert({
    where: { descripcion: 'Empleado' },
    update: {},
    create: { descripcion: 'Empleado' }
  });

  const rolCliente = await prisma.rol.upsert({
    where: { descripcion: 'Cliente' },
    update: {},
    create: { descripcion: 'Cliente' }
  });

  const rolSecretaria = await prisma.rol.upsert({
    where: { descripcion: 'Secretaria' },
    update: {},
    create: { descripcion: 'Secretaria' }
  });

  console.log('Roles creados:', { rolAdmin, rolEmpleado, rolCliente, rolSecretaria });

  // ==================== PERMISOS ====================
  const permisosData = [
    'Ver citas',
    'Cambiar estado de trabajo',
    'Gestionar trabajos',
    'Agendar citas',
    'Ver facturas',
    'Generar facturas',
    'Gestionar empleados',
    'Activar o desactivar mecanicos'
  ];

  const permisosCreadas = [];
  for (const p of permisosData) {
    const permiso = await prisma.permiso.upsert({
      where: { permiso: p },
      update: {},
      create: { permiso: p }
    });
    permisosCreadas.push(permiso);
  }

  console.log('Permisos creados:', permisosCreadas.length);

  await prisma.detallePermiso.deleteMany({});

  await prisma.detallePermiso.createMany({
    data: [
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Ver citas').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Ver facturas').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Gestionar empleados').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Gestionar trabajos').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Agendar citas').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Generar facturas').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Cambiar estado de trabajo').id },
      { rolId: rolAdmin.id, permisoId: permisosCreadas.find(p => p.permiso === 'Activar o desactivar mecanicos').id },
      { rolId: rolSecretaria.id, permisoId: permisosCreadas.find(p => p.permiso === 'Ver citas').id },
      { rolId: rolSecretaria.id, permisoId: permisosCreadas.find(p => p.permiso === 'Generar facturas').id },
      { rolId: rolSecretaria.id, permisoId: permisosCreadas.find(p => p.permiso === 'Agendar citas').id },
      { rolId: rolSecretaria.id, permisoId: permisosCreadas.find(p => p.permiso === 'Ver facturas').id },
      { rolId: rolEmpleado.id, permisoId: permisosCreadas.find(p => p.permiso === 'Ver citas').id },
      { rolId: rolEmpleado.id, permisoId: permisosCreadas.find(p => p.permiso === 'Cambiar estado de trabajo').id },
    ]
  });

  console.log('Permisos asignados a roles');

  // ==================== USUARIO ADMIN ====================
  const passwordAdmin = await bcrypt.hash('admin1919', 10);
  let adminUser = await prisma.usuario.findUnique({ where: { email: 'admin@adnmotors.com' } });

  if (!adminUser) {
    adminUser = await prisma.usuario.create({
      data: {
        nombreCompleto: 'Administrador ADN',
        email: 'admin@adnmotors.com',
        password: passwordAdmin,
        telefono: '70000000',
        sexo: 'Masculino',
        rolId: rolAdmin.id,
        emailVerificado: true
      }
    });
    console.log('Usuario admin creado:', adminUser.email);
  } else {
    adminUser = await prisma.usuario.update({
      where: { email: 'admin@adnmotors.com' },
      data: { password: passwordAdmin }
    });
    console.log('Contrasena admin actualizada');
  }

  // ==================== EMPLEADOS ====================
  const empleadosData = [
    { nombre: 'Carlos Méndez', email: 'carlos@adnmotors.com', telefono: '70111111', cargo: 'Mecánico Jefe', sexo: 'Masculino' },
    { nombre: 'María López', email: 'maria@adnmotors.com', telefono: '70222222', cargo: 'Mecánica', sexo: 'Femenino' },
    { nombre: 'Pedro Romero', email: 'pedro@adnmotors.com', telefono: '70333333', cargo: 'Mecánico', sexo: 'Masculino' },
    { nombre: 'Ana Vargas', email: 'ana@adnmotors.com', telefono: '70444444', cargo: 'Secretaria', sexo: 'Femenino' },
  ];

  const empleadosCreados = [];
  for (const emp of empleadosData) {
    const existing = await prisma.usuario.findUnique({ where: { email: emp.email } });
    if (!existing) {
      const hash = await bcrypt.hash('empleado123', 10);
      const user = await prisma.usuario.create({
        data: {
          nombreCompleto: emp.nombre,
          email: emp.email,
          password: hash,
          telefono: emp.telefono,
          sexo: emp.sexo,
          rolId: emp.cargo === 'Secretaria' ? rolSecretaria.id : rolEmpleado.id,
          emailVerificado: true
        }
      });
      await prisma.empleado.create({
        data: { usuarioId: user.id, cargo: emp.cargo }
      });
      empleadosCreados.push(user);
      console.log('Empleado creado:', emp.nombre);
    } else {
      const empleado = await prisma.empleado.findUnique({ where: { usuarioId: existing.id } });
      if (!empleado) {
        await prisma.empleado.create({
          data: { usuarioId: existing.id, cargo: emp.cargo }
        });
      }
      empleadosCreados.push(existing);
    }
  }

  // ==================== PROVEEDORES ====================
  const proveedoresData = [
    { nombre: 'Repuestos El Alto SRL', contacto: 'Juan Pérez', telefono: '60111111' },
    { nombre: 'Importadora Oriental', contacto: 'Luis Gómez', telefono: '60222222' },
    { nombre: 'Distribuidora Bosch Bolivia', contacto: 'Carla Ruiz', telefono: '60333333' },
    { nombre: 'Llantas y Más', contacto: 'Roberto Soliz', telefono: '60444444' },
  ];

  const proveedoresCreados = [];
  for (const p of proveedoresData) {
    const existing = await prisma.proveedor.findFirst({ where: { nombre: p.nombre } });
    if (!existing) {
      const prov = await prisma.proveedor.create({ data: p });
      proveedoresCreados.push(prov);
      console.log('Proveedor creado:', p.nombre);
    } else {
      proveedoresCreados.push(existing);
    }
  }

  // ==================== INVENTARIO ====================
  const inventarioData = [
    { codigo: 'FRN-001', nombre: 'Pastillas de freno delanteras', categoria: 'frenos', stockActual: 25, stockMinimo: 10, precioCompra: 80, precioVenta: 150, proveedorIdx: 0 },
    { codigo: 'FRN-002', nombre: 'Discos de freno traseros', categoria: 'frenos', stockActual: 15, stockMinimo: 8, precioCompra: 120, precioVenta: 220, proveedorIdx: 0 },
    { codigo: 'ACE-001', nombre: 'Aceite 20W50 galón', categoria: 'aceites', stockActual: 40, stockMinimo: 15, precioCompra: 45, precioVenta: 90, proveedorIdx: 1 },
    { codigo: 'ACE-002', nombre: 'Aceite de transmisión ATF', categoria: 'aceites', stockActual: 20, stockMinimo: 10, precioCompra: 55, precioVenta: 110, proveedorIdx: 1 },
    { codigo: 'FIL-001', nombre: 'Filtro de aceite', categoria: 'filtros', stockActual: 35, stockMinimo: 15, precioCompra: 20, precioVenta: 45, proveedorIdx: 2 },
    { codigo: 'FIL-002', nombre: 'Filtro de aire', categoria: 'filtros', stockActual: 30, stockMinimo: 12, precioCompra: 30, precioVenta: 65, proveedorIdx: 2 },
    { codigo: 'MOT-001', nombre: 'Bujías NGK (juego 4)', categoria: 'motor', stockActual: 18, stockMinimo: 8, precioCompra: 60, precioVenta: 130, proveedorIdx: 1 },
    { codigo: 'MOT-002', nombre: 'Correa de distribución', categoria: 'motor', stockActual: 8, stockMinimo: 5, precioCompra: 150, precioVenta: 300, proveedorIdx: 2 },
    { codigo: 'SUS-001', nombre: 'Amortiguadores delanteros', categoria: 'suspension', stockActual: 10, stockMinimo: 5, precioCompra: 200, precioVenta: 380, proveedorIdx: 0 },
    { codigo: 'SUS-002', nombre: 'Rótulas de dirección', categoria: 'suspension', stockActual: 3, stockMinimo: 6, precioCompra: 90, precioVenta: 180, proveedorIdx: 0 },
    { codigo: 'ELE-001', nombre: 'Batería 12V 70Ah', categoria: 'electricidad', stockActual: 12, stockMinimo: 5, precioCompra: 250, precioVenta: 450, proveedorIdx: 2 },
    { codigo: 'ELE-002', nombre: 'Alternador', categoria: 'electricidad', stockActual: 5, stockMinimo: 3, precioCompra: 350, precioVenta: 600, proveedorIdx: 2 },
    { codigo: 'LLA-001', nombre: 'Neumático 205/55R16', categoria: 'llantas', stockActual: 20, stockMinimo: 8, precioCompra: 400, precioVenta: 700, proveedorIdx: 3 },
    { codigo: 'LLA-002', nombre: 'Neumático 175/65R14', categoria: 'llantas', stockActual: 15, stockMinimo: 8, precioCompra: 320, precioVenta: 580, proveedorIdx: 3 },
    { codigo: 'CAR-001', nombre: 'Faros delanteros LED', categoria: 'carroceria', stockActual: 7, stockMinimo: 3, precioCompra: 180, precioVenta: 350, proveedorIdx: 1 },
    { codigo: 'CAR-002', nombre: 'Espejo retrovisor derecho', categoria: 'carroceria', stockActual: 4, stockMinimo: 3, precioCompra: 100, precioVenta: 200, proveedorIdx: 1 },
    { codigo: 'OTR-001', nombre: 'Líquido de frenos DOT4', categoria: 'otros', stockActual: 22, stockMinimo: 10, precioCompra: 25, precioVenta: 55, proveedorIdx: 0 },
    { codigo: 'OTR-002', nombre: 'Refrigerante 50/50 galón', categoria: 'otros', stockActual: 18, stockMinimo: 8, precioCompra: 35, precioVenta: 70, proveedorIdx: 0 },
  ];

  for (const inv of inventarioData) {
    const existing = await prisma.inventario.findUnique({ where: { codigo: inv.codigo } });
    if (!existing) {
      const provId = proveedoresCreados[inv.proveedorIdx]?.id || null;
      const item = await prisma.inventario.create({
        data: {
          codigo: inv.codigo,
          nombre: inv.nombre,
          categoria: inv.categoria,
          stockActual: inv.stockActual,
          stockMinimo: inv.stockMinimo,
          precioCompra: inv.precioCompra,
          precioVenta: inv.precioVenta,
          proveedorId: provId,
          unidadMedida: 'unidad',
        }
      });
      await prisma.movimientoInventario.create({
        data: {
          inventarioId: item.id,
          tipo: 'entrada',
          cantidad: inv.stockActual,
          stockAnterior: 0,
          stockNuevo: inv.stockActual,
          usuarioId: adminUser.id,
          observaciones: 'Stock inicial (seed)',
        },
      });
      console.log('Inventario creado:', inv.nombre);
    }
  }

  // ==================== SERVICIOS (adicionales) ====================
  const serviciosData = [
    { categoria: 'Mantenimiento', descripcion: 'Mantenimiento de frenos', costo: 300, duracionEstimada: '60 minutos' },
    { categoria: 'Cambios', descripcion: 'Cambio de aceite', costo: 100, duracionEstimada: '20 minutos' },
    { categoria: 'Frenos', descripcion: 'Sistema de frenos', costo: 300, duracionEstimada: '60 minutos' },
    { categoria: 'Balanceo', descripcion: 'Alineación y balanceo', costo: 350, duracionEstimada: '60 minutos' },
    { categoria: 'Mantenimiento', descripcion: 'Mantenimiento general', costo: 250, duracionEstimada: '2 horas' },
    { categoria: 'Diagnóstico', descripcion: 'Diagnóstico computarizado', costo: 550, duracionEstimada: '60 minutos' },
    { categoria: 'Motor', descripcion: 'Reparación de motor', costo: 1500, duracionEstimada: '8 horas' },
    { categoria: 'Suspensión', descripcion: 'Cambio de amortiguadores', costo: 600, duracionEstimada: '2 horas' },
    { categoria: 'Electricidad', descripcion: 'Diagnóstico eléctrico', costo: 400, duracionEstimada: '1 hora' },
  ];

  for (const s of serviciosData) {
    const existing = await prisma.servicio.findUnique({ where: { descripcion: s.descripcion } });
    if (!existing) {
      await prisma.servicio.create({ data: s });
    }
  }
  console.log('Servicios creados/verificados:', serviciosData.length);

  // ==================== CLIENTES Y CITAS DE EJEMPLO ====================
  const clientesData = [
    { nombre: 'Juan Pérez', email: 'juan@email.com', telefono: '71000001', direccion: 'Av. Siempre Viva 123', sexo: 'Masculino', edad: 35 },
    { nombre: 'Ana Rodríguez', email: 'ana@email.com', telefono: '71000002', direccion: 'Calle 5 Nro 456', sexo: 'Femenino', edad: 28 },
    { nombre: 'Roberto Quispe', email: 'roberto@email.com', telefono: '71000003', direccion: 'Zona Central 789', sexo: 'Masculino', edad: 42 },
    { nombre: 'Carmen Flores', email: 'carmen@email.com', telefono: '71000004', direccion: 'Av. Principal 321', sexo: 'Femenino', edad: 31 },
  ];

  const clientesCreados = [];
  for (const c of clientesData) {
    const existing = await prisma.usuario.findUnique({ where: { email: c.email } });
    if (!existing) {
      const hash = await bcrypt.hash('cliente123', 10);
      const user = await prisma.usuario.create({
        data: {
          nombreCompleto: c.nombre,
          email: c.email,
          password: hash,
          telefono: c.telefono,
          direccion: c.direccion,
          sexo: c.sexo,
          edad: c.edad,
          rolId: rolCliente.id,
          emailVerificado: true,
        }
      });
      await prisma.cliente.create({ data: { usuarioId: user.id } });
      clientesCreados.push(user);
      console.log('Cliente creado:', c.nombre);
    } else {
      const cliente = await prisma.cliente.findUnique({ where: { usuarioId: existing.id } });
      if (!cliente) {
        await prisma.cliente.create({ data: { usuarioId: existing.id } });
      }
      clientesCreados.push(existing);
    }
  }

  // Get existing citas count
  const citasCount = await prisma.cita.count();
  if (citasCount === 0 && empleadosCreados.length > 0 && clientesCreados.length > 0) {
    const today = new Date();
    const citasData = [
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), horaInicio: '09:00', horaFin: '10:30', estado: 'Completado', clienteIdx: 0, empleadoIdx: 0 },
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), horaInicio: '10:00', horaFin: '11:30', estado: 'Completado', clienteIdx: 1, empleadoIdx: 1 },
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate()), horaInicio: '08:30', horaFin: '10:00', estado: 'En_progreso', clienteIdx: 2, empleadoIdx: 2 },
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate()), horaInicio: '11:00', horaFin: '12:00', estado: 'Agendado', clienteIdx: 3, empleadoIdx: 0 },
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), horaInicio: '14:00', horaFin: '15:30', estado: 'Agendado', clienteIdx: 0, empleadoIdx: 1 },
      { fecha: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), horaInicio: '09:30', horaFin: '11:00', estado: 'Agendado', clienteIdx: 1, empleadoIdx: 2 },
    ];

    for (const cita of citasData) {
      const cliente = await prisma.cliente.findUnique({ where: { usuarioId: clientesCreados[cita.clienteIdx].id } });
      const empleado = await prisma.empleado.findFirst({ where: { usuarioId: empleadosCreados[cita.empleadoIdx].id } });
      if (cliente && empleado) {
        const created = await prisma.cita.create({
          data: {
            fechaCita: cita.fecha,
            horaInicio: new Date(`1970-01-01T${cita.horaInicio}:00`),
            horaFin: new Date(`1970-01-01T${cita.horaFin}:00`),
            estado: cita.estado,
            clienteId: cliente.id,
            empleadoId: empleado.id,
          }
        });

        const servicios = await prisma.servicio.findMany({ take: 2 });
        for (const servicio of servicios) {
          await prisma.detalleServicio.upsert({
            where: { citaId_servicioId: { citaId: created.id, servicioId: servicio.id } },
            update: {},
            create: { citaId: created.id, servicioId: servicio.id },
          });
        }
        console.log('Cita creada:', created.id);
      }
    }
  } else {
    console.log('Citas existentes:', citasCount, '(no se crearon nuevas)');
  }

  // ==================== FACTURAS Y PAGOS DE EJEMPLO ====================
  const citasCompletadas = await prisma.cita.findMany({
    where: { estado: 'Completado' },
    include: { detalleServicios: { include: { servicio: true } } },
  });

  let facturasCreadas = 0;
  let pagosCreados = 0;

  for (let idx = 0; idx < citasCompletadas.length; idx++) {
    const cita = citasCompletadas[idx];
    const existing = await prisma.factura.findUnique({ where: { citaId: cita.id } });
    if (existing) continue;

    const total = cita.detalleServicios.reduce((s, ds) => s + Number(ds.servicio.costo), 0);
    const fechaEmision = new Date(cita.fechaCita);
    fechaEmision.setDate(fechaEmision.getDate() + 1);
    fechaEmision.setHours(10 + idx, 30 * idx, 0, 0);

    const factura = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-SEED-${Date.now()}-${idx}`,
        citaId: cita.id,
        clienteId: cita.clienteId,
        usuarioId: adminUser.id,
        total,
        fechaEmision,
        detalleFacturas: {
          create: cita.detalleServicios.map(ds => ({
            servicioId: ds.servicioId,
            descripcion: ds.servicio.descripcion,
            cantidad: 1,
            precioUnitario: ds.servicio.costo,
            subtotal: ds.servicio.costo,
          })),
        },
      },
    });
    facturasCreadas++;

    // Create 1-2 pagos per factura
    const metodos = ['efectivo', 'QR', 'tarjeta', 'transferencia'];
    const metodo = metodos[idx % metodos.length];
    const numPagos = idx % 3 === 0 ? 2 : 1;

    for (let p = 0; p < numPagos; p++) {
      const montoParcial = p === 0 ? Math.round(total / (numPagos === 2 ? 2 : 1)) : total - Math.round(total / 2);
      await prisma.pago.create({
        data: {
          facturaId: factura.id,
          monto: montoParcial,
          metodo,
          referencia: metodo === 'transferencia' ? `REF-${Date.now()}-${p}` : null,
          estado: 'completado',
          fechaPago: new Date(fechaEmision.getTime() + p * 3600000),
        },
      });
      pagosCreados++;
    }

    if (numPagos === 2 || idx % 2 === 0) {
      await prisma.factura.update({
        where: { id: factura.id },
        data: { estado: 'pagada' },
      });
    }
  }

  // Create 2 extra facturas with pagos for older dates (richer report data)
  const extraCitas = await prisma.cita.findMany({
    where: { estado: { in: ['Completado', 'Entregado'] }, factura: null },
    include: { detalleServicios: { include: { servicio: true } } },
    take: 3,
  });

  for (let idx = 0; idx < extraCitas.length; idx++) {
    const cita = extraCitas[idx];
    const total = cita.detalleServicios.reduce((s, ds) => s + Number(ds.servicio.costo), 0);
    const fechaEmision = new Date(cita.fechaCita);
    fechaEmision.setDate(fechaEmision.getDate() - 5 - idx * 3);
    fechaEmision.setHours(14 + idx, 0, 0, 0);

    const factura = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-EXTRA-${Date.now()}-${idx}`,
        citaId: cita.id,
        clienteId: cita.clienteId,
        usuarioId: adminUser.id,
        total,
        fechaEmision,
        detalleFacturas: {
          create: cita.detalleServicios.map(ds => ({
            servicioId: ds.servicioId,
            descripcion: ds.servicio.descripcion,
            cantidad: 1,
            precioUnitario: ds.servicio.costo,
            subtotal: ds.servicio.costo,
          })),
        },
      },
    });
    facturasCreadas++;

    const metodos = ['efectivo', 'QR', 'tarjeta', 'transferencia'];
    await prisma.pago.create({
      data: {
        facturaId: factura.id,
        monto: total,
        metodo: metodos[(idx + 2) % metodos.length],
        estado: 'completado',
        fechaPago: fechaEmision,
      },
    });
    pagosCreados++;

    await prisma.factura.update({
      where: { id: factura.id },
      data: { estado: 'pagada' },
    });
  }

  console.log(`Facturas creadas/vinculadas: ${facturasCreadas}`);
  console.log(`Pagos creados: ${pagosCreados}`);

  // ==================== HORARIOS EMPLEADOS ====================
  const todosEmpleados = await prisma.empleado.findMany({
    where: { estado: true },
    include: { usuario: { select: { nombreCompleto: true } } }
  });

  for (const emp of todosEmpleados) {
    const horariosExistentes = await prisma.horariosEmpleado.count({
      where: { empleadoId: emp.id }
    });

    if (horariosExistentes === 0) {
      const esMecanico = emp.cargo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('mecanic') || emp.cargo.toLowerCase().includes('jefe');
      const diaSemanaStart = 1; // Lunes
      const diaSemanaEnd = esMecanico ? 6 : 5; // Sábado para mecánicos, Viernes para secretaria

      for (let dia = diaSemanaStart; dia <= diaSemanaEnd; dia++) {
        const horariosDia = esMecanico
          ? [
              { horaInicio: '08:00', horaFin: '09:00' },
              { horaInicio: '09:00', horaFin: '10:00' },
              { horaInicio: '10:00', horaFin: '11:00' },
              { horaInicio: '11:00', horaFin: '12:00' },
              { horaInicio: '14:00', horaFin: '15:00' },
              { horaInicio: '15:00', horaFin: '16:00' },
              { horaInicio: '16:00', horaFin: '17:00' },
              { horaInicio: '17:00', horaFin: '18:00' },
            ]
          : [
              { horaInicio: '08:00', horaFin: '09:00' },
              { horaInicio: '09:00', horaFin: '10:00' },
              { horaInicio: '10:00', horaFin: '11:00' },
              { horaInicio: '11:00', horaFin: '12:00' },
              { horaInicio: '14:00', horaFin: '15:00' },
              { horaInicio: '15:00', horaFin: '16:00' },
            ];

        for (const slot of horariosDia) {
          await prisma.horariosEmpleado.create({
            data: {
              empleadoId: emp.id,
              diaSemana: dia,
              horaInicio: slot.horaInicio,
              horaFin: slot.horaFin,
              tipoServicio: 'ambos',
              activo: true
            }
          });
        }
      }
      console.log(`Horarios creados para ${emp.usuario.nombreCompleto} (${emp.cargo})`);
    }
  }

  console.log('\nSeed completado exitosamente!');
  console.log('\nCredenciales:');
  console.log('  Admin:    admin@adnmotors.com / admin1919');
  console.log('  Empleado: carlos@adnmotors.com / empleado123');
  console.log('  Empleado: maria@adnmotors.com / empleado123');
  console.log('  Cliente:  juan@email.com / cliente123');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
