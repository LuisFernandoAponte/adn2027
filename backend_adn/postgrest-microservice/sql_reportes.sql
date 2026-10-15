-- ============================================================
-- ADN Motors - Funciones de Reportes y Estadísticas
-- ============================================================

-- ============================================================
-- REPORTE: Ingresos por período
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_ingresos_por_periodo(
    p_fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_ingresos_totales DECIMAL;
    v_promedio_diario DECIMAL;
    v_dias INT;
    v_por_servicio JSONB;
    v_por_mecanico JSONB;
BEGIN
    SELECT COALESCE(SUM(f.total), 0) INTO v_ingresos_totales
    FROM factura f
    WHERE f."fechaEmision"::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
      AND f.estado = 'emitida';

    v_dias := GREATEST((p_fecha_fin - p_fecha_inicio), 1);
    v_promedio_diario := v_ingresos_totales / v_dias;

    SELECT jsonb_agg(sub) INTO v_por_servicio FROM (
        SELECT s.descripcion AS servicio, COUNT(*) AS veces, SUM(s.costo) AS total
        FROM detalle_servicio ds
        JOIN servicios s ON ds."servicioId" = s.id
        JOIN citas c ON ds."citaId" = c.id
        JOIN factura f ON f."citaId" = c.id
        WHERE f."fechaEmision"::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
          AND f.estado = 'emitida'
        GROUP BY s.descripcion
        ORDER BY total DESC
    ) sub;

    SELECT jsonb_agg(sub) INTO v_por_mecanico FROM (
        SELECT u."nombreCompleto" AS mecanico, COUNT(c.id) AS trabajos, COALESCE(SUM(f.total), 0) AS total_facturado
        FROM empleado e
        JOIN usuario u ON e."usuarioId" = u.id
        JOIN citas c ON c."empleadoId" = e.id
        JOIN factura f ON f."citaId" = c.id
        WHERE f."fechaEmision"::DATE BETWEEN p_fecha_inicio AND p_fecha_fin
          AND f.estado = 'emitida'
        GROUP BY u."nombreCompleto"
        ORDER BY total_facturado DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'fecha_inicio', p_fecha_inicio,
        'fecha_fin', p_fecha_fin,
        'ingresos_totales', v_ingresos_totales,
        'promedio_diario', v_promedio_diario,
        'dias', v_dias,
        'por_servicio', COALESCE(v_por_servicio, '[]'::jsonb),
        'por_mecanico', COALESCE(v_por_mecanico, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- REPORTE: Servicios más usados
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_servicios_mas_usados(
    p_limite INT DEFAULT 10,
    p_fecha_inicio DATE DEFAULT '2020-01-01',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_resultados JSONB;
BEGIN
    SELECT jsonb_agg(sub) INTO v_resultados FROM (
        SELECT s.descripcion AS servicio, s.categoria, COUNT(ds.id) AS veces_usado,
               COUNT(DISTINCT ds."citaId") AS citas,
               SUM(s.costo) AS total_generado,
               ROUND(AVG(s.costo)::DECIMAL, 2) AS costo_promedio
        FROM detalle_servicio ds
        JOIN servicios s ON ds."servicioId" = s.id
        JOIN citas c ON ds."citaId" = c.id
        WHERE c."fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY s.descripcion, s.categoria, s.id
        ORDER BY veces_usado DESC, total_generado DESC
        LIMIT p_limite
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'total_servicios_distintos', (SELECT COUNT(*) FROM servicios WHERE estado = true),
        'servicios', COALESCE(v_resultados, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- REPORTE: Rendimiento de empleados
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_rendimiento_empleados(
    p_fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_resultados JSONB;
BEGIN
    SELECT jsonb_agg(sub) INTO v_resultados FROM (
        SELECT u."nombreCompleto" AS nombre, e.cargo,
               COUNT(c.id) AS total_citas,
               COUNT(CASE WHEN c.estado IN ('Completado', 'Entregado') THEN 1 END) AS completadas,
               COUNT(CASE WHEN c.estado = 'Cancelado' THEN 1 END) AS canceladas,
               CASE WHEN COUNT(c.id) > 0
                    THEN ROUND(100.0 * COUNT(CASE WHEN c.estado IN ('Completado', 'Entregado') THEN 1 END) / COUNT(c.id), 1)
                    ELSE 0 END AS tasa_completacion,
               COALESCE(SUM(f.total), 0) AS total_facturado,
               COUNT(DISTINCT c."clienteId") AS clientes_atendidos
        FROM empleado e
        JOIN usuario u ON e."usuarioId" = u.id
        LEFT JOIN citas c ON c."empleadoId" = e.id AND c."fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin
        LEFT JOIN factura f ON f."citaId" = c.id AND f.estado = 'emitida'
        WHERE e.estado = true
        GROUP BY u."nombreCompleto", e.cargo, e.id
        ORDER BY total_citas DESC, total_facturado DESC
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'fecha_inicio', p_fecha_inicio,
        'fecha_fin', p_fecha_fin,
        'empleados', COALESCE(v_resultados, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- REPORTE: Citas por estado
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_citas_por_estado(
    p_fecha_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_por_estado JSONB;
    v_tendencia JSONB;
BEGIN
    SELECT jsonb_agg(sub) INTO v_por_estado FROM (
        SELECT estado, COUNT(*) AS cantidad
        FROM citas
        WHERE "fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY estado
        ORDER BY cantidad DESC
    ) sub;

    SELECT jsonb_agg(sub) INTO v_tendencia FROM (
        SELECT TO_CHAR(d, 'YYYY-MM') AS mes, COUNT(c.id) AS citas
        FROM generate_series(p_fecha_inicio, p_fecha_fin, '1 month'::INTERVAL) d
        LEFT JOIN citas c ON TO_CHAR(c."fechaCita", 'YYYY-MM') = TO_CHAR(d, 'YYYY-MM')
        GROUP BY TO_CHAR(d, 'YYYY-MM')
        ORDER BY mes
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'total_citas', (SELECT COUNT(*) FROM citas WHERE "fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin),
        'por_estado', COALESCE(v_por_estado, '[]'::jsonb),
        'tendencia_mensual', COALESCE(v_tendencia, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- REPORTE: Inventario valorizado
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_inventario_valorizado() RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_por_categoria JSONB;
    v_total_inventario DECIMAL;
    v_total_repuestos INT;
    v_stock_bajo JSONB;
BEGIN
    SELECT jsonb_agg(sub) INTO v_por_categoria FROM (
        SELECT categoria,
               COUNT(*) AS cantidad,
               SUM("stockActual") AS total_unidades,
               SUM("precioCompra" * "stockActual") AS valor_compra,
               SUM("precioVenta" * "stockActual") AS valor_venta,
               ROUND(AVG("precioVenta" - "precioCompra")::DECIMAL, 2) AS margen_promedio
        FROM inventario
        WHERE estado = true
        GROUP BY categoria
        ORDER BY valor_compra DESC
    ) sub;

    SELECT COALESCE(SUM("precioCompra" * "stockActual"), 0) INTO v_total_inventario
    FROM inventario WHERE estado = true;

    SELECT COUNT(*) INTO v_total_repuestos FROM inventario WHERE estado = true;

    SELECT jsonb_agg(sub) INTO v_stock_bajo FROM (
        SELECT codigo, nombre, "stockActual", "stockMinimo", "precioVenta"
        FROM inventario
        WHERE estado = true AND "stockActual" <= "stockMinimo"
        ORDER BY "stockActual" ASC
        LIMIT 20
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'total_repuestos', v_total_repuestos,
        'valor_total_inventario', v_total_inventario,
        'por_categoria', COALESCE(v_por_categoria, '[]'::jsonb),
        'stock_bajo', COALESCE(v_stock_bajo, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- REPORTE: Clientes frecuentes
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_clientes_frecuentes(
    p_limite INT DEFAULT 10,
    p_fecha_inicio DATE DEFAULT '2020-01-01',
    p_fecha_fin DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_resultados JSONB;
BEGIN
    SELECT jsonb_agg(sub) INTO v_resultados FROM (
        SELECT u."nombreCompleto" AS nombre, u.email, u.telefono,
               COUNT(c.id) AS total_citas,
               COUNT(CASE WHEN c.estado IN ('Completado', 'Entregado') THEN 1 END) AS completadas,
               COALESCE(SUM(f.total), 0) AS total_gastado,
               MAX(c."fechaCita") AS ultima_cita,
               ROUND(EXTRACT(DAY FROM (CURRENT_DATE - MAX(c."fechaCita")))::DECIMAL, 0) AS dias_ultima_cita
        FROM cliente cl
        JOIN usuario u ON cl."usuarioId" = u.id
        JOIN citas c ON c."clienteId" = cl.id
        LEFT JOIN factura f ON f."citaId" = c.id AND f.estado = 'emitida'
        WHERE c."fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY u."nombreCompleto", u.email, u.telefono, cl.id
        ORDER BY total_citas DESC, total_gastado DESC
        LIMIT p_limite
    ) sub;

    RETURN jsonb_build_object(
        'success', true,
        'clientes', COALESCE(v_resultados, '[]'::jsonb),
        'total_clientes_activos', (SELECT COUNT(DISTINCT c."clienteId") FROM citas c WHERE c."fechaCita" BETWEEN p_fecha_inicio AND p_fecha_fin)
    );
END;
$$;

-- ============================================================
-- REPORTE: Dashboard completo (todo en una llamada)
-- ============================================================
CREATE OR REPLACE FUNCTION reporte_dashboard_completo() RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_hoy DATE := CURRENT_DATE;
    v_inicio_mes DATE := DATE_TRUNC('month', CURRENT_DATE);
    v_resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'success', true,
        'fecha', v_hoy,
        'resumen_del_dia', jsonb_build_object(
            'citas_hoy', (SELECT COUNT(*) FROM citas WHERE "fechaCita" = v_hoy),
            'citas_pendientes', (SELECT COUNT(*) FROM citas WHERE "fechaCita" = v_hoy AND estado = 'Agendado'),
            'en_taller', (SELECT COUNT(*) FROM citas WHERE "fechaCita" = v_hoy AND estado IN ('En_taller', 'En_progreso', 'En_revision')),
            'completados_hoy', (SELECT COUNT(*) FROM citas WHERE "fechaCita" = v_hoy AND estado IN ('Completado', 'Entregado')),
            'ingresos_hoy', COALESCE((SELECT SUM(total) FROM factura WHERE "fechaEmision"::DATE = v_hoy AND estado = 'emitida'), 0)
        ),
        'resumen_del_mes', jsonb_build_object(
            'citas_totales', (SELECT COUNT(*) FROM citas WHERE "fechaCita" >= v_inicio_mes),
            'completadas', (SELECT COUNT(*) FROM citas WHERE "fechaCita" >= v_inicio_mes AND estado IN ('Completado', 'Entregado')),
            'canceladas', (SELECT COUNT(*) FROM citas WHERE "fechaCita" >= v_inicio_mes AND estado = 'Cancelado'),
            'ingresos', (SELECT COALESCE(SUM(total), 0) FROM factura WHERE "fechaEmision" >= v_inicio_mes AND estado = 'emitida'),
            'clientes_atendidos', (SELECT COUNT(DISTINCT "clienteId") FROM citas WHERE "fechaCita" >= v_inicio_mes)
        ),
        'inventario', jsonb_build_object(
            'total_repuestos', (SELECT COUNT(*) FROM inventario WHERE estado = true),
            'stock_bajo', (SELECT COUNT(*) FROM inventario WHERE estado = true AND "stockActual" <= "stockMinimo"),
            'valor_total', (SELECT COALESCE(SUM("precioCompra" * "stockActual"), 0) FROM inventario WHERE estado = true)
        ),
        'top_servicios', COALESCE((
            SELECT jsonb_agg(sub) FROM (
                SELECT s.descripcion, COUNT(*) AS veces
                FROM detalle_servicio ds
                JOIN servicios s ON ds."servicioId" = s.id
                JOIN citas c ON ds."citaId" = c.id
                WHERE c."fechaCita" >= v_inicio_mes
                GROUP BY s.descripcion
                ORDER BY veces DESC LIMIT 5
            ) sub
        ), '[]'::jsonb),
        'proximas_citas', COALESCE((
            SELECT jsonb_agg(sub) FROM (
                SELECT c.id, c."fechaCita", c."horaInicio",
                       u."nombreCompleto" AS cliente,
                       emp_u."nombreCompleto" AS mecanico,
                       c.estado
                FROM citas c
                JOIN cliente cl ON c."clienteId" = cl.id
                JOIN usuario u ON cl."usuarioId" = u.id
                JOIN empleado e ON c."empleadoId" = e.id
                JOIN usuario emp_u ON e."usuarioId" = emp_u.id
                WHERE c."fechaCita" >= v_hoy AND c.estado NOT IN ('Completado', 'Entregado', 'Cancelado')
                ORDER BY c."fechaCita" ASC, c."horaInicio" ASC
                LIMIT 10
            ) sub
        ), '[]'::jsonb)
    ) INTO v_resultado;

    RETURN v_resultado;
END;
$$;
