import { z } from 'zod';
import prisma from '../config/database.js';

const crearInventarioSchema = z.object({
  codigo: z.string().min(1, 'Código requerido').max(50),
  nombre: z.string().min(1, 'Nombre requerido').max(100),
  descripcion: z.string().optional().nullable(),
  categoria: z.string().min(1, 'Categoría requerida'),
  stock_actual: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  precio_compra: z.number().min(0, 'Precio de compra debe ser >= 0'),
  precio_venta: z.number().min(0, 'Precio de venta debe ser >= 0'),
  unidad_medida: z.string().max(20).optional(),
  proveedor_id: z.string().optional().nullable(),
  ubicacion: z.string().max(50).optional().nullable(),
});

const ajustarStockSchema = z.object({
  cantidad: z.number().int().positive('Cantidad debe ser mayor a 0'),
  tipo: z.enum(['entrada', 'salida', 'ajuste']),
  observaciones: z.string().optional().nullable(),
});

export const obtenerResumenInventario = async (req, res) => {
  try {
    const items = await prisma.inventario.findMany({
      where: { estado: true },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        citasRepuestos: { select: { cantidad: true } }
      }
    });

    let totalRepuestos = items.length;
    let totalUnidades = 0;
    let valorCostoTotal = 0;
    let valorVentaTotal = 0;
    let countStockBajo = 0;
    let countAgotados = 0;
    let countCriticos = 0;
    let countNormales = 0;

    const itemsProcesados = items.map(i => {
      const stock = i.stockActual || 0;
      const min = i.stockMinimo || 5;
      const costo = Number(i.precioCompra || 0);
      const venta = Number(i.precioVenta || 0);
      const valCosto = stock * costo;
      const valVenta = stock * venta;
      const margenVal = venta - costo;
      const margenPorc = costo > 0 ? (margenVal / costo) * 100 : 0;
      const totalUsos = (i.citasRepuestos || []).reduce((acc, cr) => acc + (cr.cantidad || 0), 0);

      totalUnidades += stock;
      valorCostoTotal += valCosto;
      valorVentaTotal += valVenta;

      let estadoStock = 'STOCK NORMAL';
      if (stock === 0) {
        estadoStock = 'AGOTADO';
        countAgotados++;
      } else if (stock <= Math.floor(min / 2)) {
        estadoStock = 'STOCK CRÍTICO';
        countCriticos++;
        countStockBajo++;
      } else if (stock <= min) {
        estadoStock = 'STOCK BAJO';
        countStockBajo++;
      } else {
        countNormales++;
      }

      return {
        id: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        descripcion: i.descripcion,
        categoria: i.categoria,
        stock_actual: stock,
        stock_minimo: min,
        costo,
        precio_venta: venta,
        margen_unitario: margenVal,
        margen_porcentaje: Math.round(margenPorc * 10) / 10,
        valor_costo: valCosto,
        valor_venta: valVenta,
        unidad_medida: i.unidadMedida || 'unidad',
        proveedor_id: i.proveedorId,
        proveedor: i.proveedor?.nombre || 'Sin Proveedor',
        ubicacion: i.ubicacion || 'Almacén Central',
        estado_stock: estadoStock,
        total_usos: totalUsos,
        sugerencia_reabastecimiento: stock <= min ? Math.max(0, min * 2 - stock) : 0
      };
    });

    // Top repuestos más utilizados
    const topMasUtilizados = [...itemsProcesados]
      .sort((a, b) => b.total_usos - a.total_usos)
      .slice(0, 5);

    return res.json({
      success: true,
      resumen: {
        total_repuestos: totalRepuestos,
        total_unidades: totalUnidades,
        valor_inventario_costo: valorCostoTotal,
        valor_potencial_venta: valorVentaTotal,
        margen_potencial_total: valorVentaTotal - valorCostoTotal,
        count_stock_bajo: countStockBajo,
        count_criticos: countCriticos,
        count_agotados: countAgotados,
        count_normales: countNormales
      },
      top_mas_utilizados: topMasUtilizados
    });

  } catch (error) {
    console.error('Error obtenerResumenInventario:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener resumen de inventario' });
  }
};

export const listar = async (req, res) => {
  try {
    const { categoria, busqueda, stock_bajo } = req.query;

    const where = { estado: true };

    if (categoria && categoria !== 'Todas') where.categoria = categoria;
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { codigo: { contains: busqueda, mode: 'insensitive' } },
        { ubicacion: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.inventario.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true, contacto: true, telefono: true } },
        citasRepuestos: { select: { cantidad: true } }
      },
      orderBy: { nombre: 'asc' },
    });

    const resultado = items.map(i => {
      const stock = i.stockActual || 0;
      const min = i.stockMinimo || 5;
      const costo = Number(i.precioCompra || 0);
      const venta = Number(i.precioVenta || 0);
      const margenVal = venta - costo;
      const margenPorc = costo > 0 ? (margenVal / costo) * 100 : 0;
      const totalUsos = (i.citasRepuestos || []).reduce((acc, cr) => acc + (cr.cantidad || 0), 0);

      let estadoStock = 'STOCK NORMAL';
      if (stock === 0) {
        estadoStock = 'AGOTADO';
      } else if (stock <= Math.floor(min / 2)) {
        estadoStock = 'STOCK CRÍTICO';
      } else if (stock <= min) {
        estadoStock = 'STOCK BAJO';
      }

      return {
        ...i,
        costo,
        precio_venta: venta,
        margen_unitario: margenVal,
        margen_porcentaje: Math.round(margenPorc * 10) / 10,
        valor_costo: stock * costo,
        valor_venta: stock * venta,
        stock_bajo: stock <= min,
        estado_stock: estadoStock,
        total_usos: totalUsos,
        proveedor: i.proveedor?.nombre || 'Sin Proveedor',
        sugerencia_reabastecimiento: stock <= min ? Math.max(0, min * 2 - stock) : 0
      };
    });

    // Filtrar si pidieron stock bajo en query
    const finalData = stock_bajo === 'true'
      ? resultado.filter(item => item.stock_bajo)
      : resultado;

    return res.json({ success: true, inventario: finalData });
  } catch (error) {
    console.error('Error listar inventario:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener inventario' });
  }
};

export const obtener = async (req, res) => {
  try {
    const item = await prisma.inventario.findUnique({
      where: { id: req.params.id },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        movimientos: {
          orderBy: { fechaReg: 'desc' },
          take: 20,
          include: { usuario: { select: { nombreCompleto: true } } },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }

    return res.json({
      success: true,
      inventario: { ...item, costo: Number(item.precioCompra), precio_venta: Number(item.precioVenta) },
    });
  } catch (error) {
    console.error('Error obtener repuesto:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener repuesto' });
  }
};

export const crear = async (req, res) => {
  try {
    const parsed = crearInventarioSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ success: false, error: errors });
    }

    const { codigo, nombre, descripcion, categoria, stock_actual, stock_minimo, precio_compra, precio_venta, unidad_medida, proveedor_id, ubicacion } = parsed.data;

    const existente = await prisma.inventario.findUnique({ where: { codigo } });
    if (existente) {
      return res.status(400).json({ success: false, error: 'Ya existe un repuesto con ese código' });
    }

    const item = await prisma.inventario.create({
      data: {
        codigo,
        nombre,
        descripcion: descripcion || null,
        categoria,
        stockActual: stock_actual != null ? Math.max(0, stock_actual) : 0,
        stockMinimo: stock_minimo != null ? Math.max(0, stock_minimo) : 5,
        precioCompra: precio_compra,
        precioVenta: precio_venta,
        unidadMedida: unidad_medida || 'unidad',
        proveedorId: proveedor_id || null,
        ubicacion: ubicacion || null,
      },
    });

    if (stock_actual && stock_actual > 0) {
      await prisma.movimientoInventario.create({
        data: {
          inventarioId: item.id,
          tipo: 'entrada',
          cantidad: parseInt(stock_actual),
          stockAnterior: 0,
          stockNuevo: parseInt(stock_actual),
          usuarioId: req.user.id,
          observaciones: 'Stock inicial',
        },
      });
    }

    return res.status(201).json({ success: true, message: 'Repuesto creado exitosamente', inventario: item });
  } catch (error) {
    console.error('Error crear repuesto:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Ya existe un repuesto con ese código' });
    }
    return res.status(500).json({ success: false, error: 'Error al crear repuesto' });
  }
};

export const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, stock_minimo, precio_compra, precio_venta, unidad_medida, proveedor_id, ubicacion, estado } = req.body;

    const existente = await prisma.inventario.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (categoria !== undefined) data.categoria = categoria;
    if (stock_minimo !== undefined) data.stockMinimo = Math.max(0, parseInt(stock_minimo));
    if (precio_compra !== undefined) data.precioCompra = Number(precio_compra);
    if (precio_venta !== undefined) data.precioVenta = Number(precio_venta);
    if (unidad_medida !== undefined) data.unidadMedida = unidad_medida;
    if (proveedor_id !== undefined) data.proveedorId = proveedor_id || null;
    if (ubicacion !== undefined) data.ubicacion = ubicacion;
    if (estado !== undefined) data.estado = estado;

    const actualizado = await prisma.inventario.update({ where: { id }, data });

    return res.json({ success: true, message: 'Repuesto actualizado', inventario: actualizado });
  } catch (error) {
    console.error('Error actualizar repuesto:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar repuesto' });
  }
};

export const ajustarStock = async (req, res) => {
  try {
    const { id } = req.params;

    const parsed = ajustarStockSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ success: false, error: errors });
    }

    const { cantidad, tipo, observaciones } = parsed.data;

    const item = await prisma.inventario.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }

    const stockAnterior = item.stockActual;
    let stockNuevo;

    switch (tipo) {
      case 'entrada':
        stockNuevo = stockAnterior + cantidad;
        break;
      case 'salida':
        if (stockAnterior < cantidad) {
          return res.status(400).json({ success: false, error: 'Stock insuficiente' });
        }
        stockNuevo = stockAnterior - cantidad;
        break;
      case 'ajuste':
        stockNuevo = cantidad;
        break;
      default:
        stockNuevo = stockAnterior;
    }

    await prisma.$transaction([
      prisma.inventario.update({ where: { id }, data: { stockActual: stockNuevo } }),
      prisma.movimientoInventario.create({
        data: {
          inventarioId: id,
          tipo,
          cantidad: tipo === 'ajuste' ? stockNuevo - stockAnterior : cantidad,
          stockAnterior,
          stockNuevo,
          usuarioId: req.user.id,
          observaciones: observaciones || null,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Stock actualizado',
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
    });
  } catch (error) {
    console.error('Error ajustar stock:', error);
    return res.status(500).json({ success: false, error: 'Error al ajustar stock' });
  }
};

export const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const existente = await prisma.inventario.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ success: false, error: 'Repuesto no encontrado' });
    }
    await prisma.inventario.update({ where: { id }, data: { estado: false } });
    return res.json({ success: true, message: 'Repuesto desactivado' });
  } catch (error) {
    console.error('Error eliminar repuesto:', error);
    return res.status(500).json({ success: false, error: 'Error al eliminar repuesto' });
  }
};

export const movimientos = async (req, res) => {
  try {
    const { id } = req.params;
    const movs = await prisma.movimientoInventario.findMany({
      where: { inventarioId: id },
      include: {
        usuario: { select: { nombreCompleto: true } },
      },
      orderBy: { fechaReg: 'desc' },
      take: 50,
    });

    return res.json({ success: true, movimientos: movs });
  } catch (error) {
    console.error('Error obtener movimientos:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener movimientos' });
  }
};

// ─────────────────────────────────────────────
// POST /api/inventory/:id/add-stock — Agregar stock (usa inventario_agregar_stock)
// ─────────────────────────────────────────────
export const addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, observaciones } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad debe ser mayor a 0' });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT inventario_agregar_stock($1::uuid, $2::integer, $3::uuid, $4::text) AS result
    `, id, parseInt(cantidad), req.user.id, observaciones || null);

    const json = result[0]?.result;
    if (!json?.success) {
      return res.status(400).json({ success: false, error: json?.error || 'Error al agregar stock' });
    }

    return res.json(json);
  } catch (error) {
    console.error('Error addStock:', error);
    return res.status(500).json({ success: false, error: 'Error al agregar stock' });
  }
};

// ─────────────────────────────────────────────
// POST /api/inventory/:id/deduct-stock — Descontar stock (usa inventario_descontar_stock)
// ─────────────────────────────────────────────
export const deductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, cita_id, observaciones } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ success: false, error: 'Cantidad debe ser mayor a 0' });
    }

    const result = await prisma.$queryRawUnsafe(`
      SELECT inventario_descontar_stock($1::uuid, $2::integer, $3::uuid, $4::uuid, $5::text) AS result
    `, id, parseInt(cantidad), req.user.id, cita_id || null, observaciones || null);

    const json = result[0]?.result;
    if (!json?.success) {
      return res.status(400).json({ success: false, error: json?.error || 'Error al descontar stock' });
    }

    return res.json(json);
  } catch (error) {
    console.error('Error deductStock:', error);
    return res.status(500).json({ success: false, error: 'Error al descontar stock' });
  }
};

// ─────────────────────────────────────────────
// GET /api/inventory/alerts — Alertas de stock bajo
// ─────────────────────────────────────────────
export const stockAlerts = async (req, res) => {
  try {
    const items = await prisma.inventario.findMany({
      where: {
        estado: true,
        stockActual: { lte: prisma.inventario.fields.stockMinimo },
      },
      include: { proveedor: { select: { nombre: true, telefono: true, email: true } } },
      orderBy: { stockActual: 'asc' },
    });

    const alerts = items.map(item => ({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      categoria: item.categoria,
      stock_actual: item.stockActual,
      stock_minimo: item.stockMinimo,
      deficit: item.stockMinimo - item.stockActual,
      proveedor: item.proveedor?.nombre || null,
      proveedor_contacto: item.proveedor?.telefono || item.proveedor?.email || null,
      nivel: item.stockActual === 0 ? 'critico' : item.stockActual <= item.stockMinimo / 2 ? 'bajo' : 'alerta',
    }));

    return res.json({
      success: true,
      total: alerts.length,
      criticos: alerts.filter(a => a.nivel === 'critico').length,
      bajos: alerts.filter(a => a.nivel === 'bajo').length,
      data: alerts,
    });
  } catch (error) {
    console.error('Error stockAlerts:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener alertas de stock' });
  }
};

// ─────────────────────────────────────────────
// GET /api/inventory — Listar con filtros de stock bajo
// ─────────────────────────────────────────────
export const listarInventario = async (req, res) => {
  try {
    const { categoria, busqueda, stock_bajo, proveedor_id, page, limit } = req.query;

    const where = { estado: true };
    if (categoria) where.categoria = categoria;
    if (proveedor_id) where.proveedorId = proveedor_id;
    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { codigo: { contains: busqueda, mode: 'insensitive' } },
      ];
    }
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    let [items, total] = await Promise.all([
      prisma.inventario.findMany({
        where,
        include: { proveedor: { select: { id: true, nombre: true } } },
        orderBy: { nombre: 'asc' },
        skip: stock_bajo === 'true' ? 0 : skip,
        take: stock_bajo === 'true' ? 1000 : limitNum,
      }),
      prisma.inventario.count({ where }),
    ]);

    if (stock_bajo === 'true') {
      items = items.filter(i => i.stockActual <= i.stockMinimo);
      total = items.length;
    }

    return res.json({
      success: true,
      data: items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Error listarInventario:', error);
    return res.status(500).json({ success: false, error: 'Error al listar inventario' });
  }
};
