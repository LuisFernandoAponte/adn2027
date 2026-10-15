-- ============================================================
-- ADN Motors - Funciones PostgreSQL para PostgREST
-- Ejecutar esto en pgAdmin sobre la base de datos "adnmotors"
-- ============================================================

-- ============================================================
-- MÓDULO: CITAS - Máquina de estados
-- ============================================================

CREATE OR REPLACE FUNCTION cita_cambiar_estado(
    p_cita_id UUID,
    p_nuevo_estado TEXT,
    p_usuario_id UUID,
    p_observaciones TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_estado_actual TEXT;
    v_estado_anterior TEXT;
    v_flujo TEXT[] := ARRAY['Agendado','En_taller','En_progreso','En_revision','Completado','Entregado'];
    v_idx_actual INT;
    v_idx_nuevo INT;
    v_rol_nombre TEXT;
BEGIN
    -- Obtener estado actual de la cita
    SELECT estado INTO v_estado_actual FROM citas WHERE id = p_cita_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cita no encontrada';
    END IF;

    -- Obtener rol del usuario
    SELECT r.descripcion INTO v_rol_nombre
    FROM usuario u JOIN rol r ON u."rolId" = r.id
    WHERE u.id = p_usuario_id;

    -- Validar flujo consecutivo
    v_idx_actual := array_position(v_flujo, v_estado_actual);
    v_idx_nuevo := array_position(v_flujo, p_nuevo_estado);

    IF v_idx_nuevo IS NULL THEN
        RAISE EXCEPTION 'Estado inválido: %', p_nuevo_estado;
    END IF;

    IF v_idx_nuevo != v_idx_actual + 1 THEN
        RAISE EXCEPTION 'No se puede saltar estados: % -> %', v_estado_actual, p_nuevo_estado;
    END IF;

    -- Restricción por rol: Mecánico solo puede pasar a En_progreso o Completado
    IF v_rol_nombre = 'Empleado' AND p_nuevo_estado NOT IN ('En_progreso', 'Completado') THEN
        RAISE EXCEPTION 'No tienes permisos para este cambio de estado';
    END IF;

    -- Actualizar cita
    UPDATE citas SET estado = p_nuevo_estado::"EstadoCita" WHERE id = p_cita_id;

    -- Insertar historial
    INSERT INTO estado_trabajo (estado, "estadoAnterior", "citaId", "usuarioId", observaciones)
    VALUES (p_nuevo_estado, v_estado_actual, p_cita_id, p_usuario_id, p_observaciones);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Estado actualizado correctamente',
        'estado_anterior', v_estado_actual,
        'estado_nuevo', p_nuevo_estado
    );
END;
$$;


-- ============================================================
-- MÓDULO: CITAS - Agendar cita (con validación de horario)
-- ============================================================

CREATE OR REPLACE FUNCTION cita_agendar(
    p_cliente_id UUID,
    p_empleado_id UUID,
    p_servicios UUID[],
    p_fecha_cita DATE,
    p_hora_inicio TIME,
    p_observaciones TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_hora_fin TIME;
    v_total_minutos INT := 0;
    v_duracion TEXT;
    v_valor NUMERIC;
    v_cita_id UUID;
    v_servicio RECORD;
BEGIN
    -- Validar que el horario no esté ocupado
    IF EXISTS (
        SELECT 1 FROM citas
        WHERE "empleadoId" = p_empleado_id
          AND "fechaCita" = p_fecha_cita
          AND "horaInicio" = p_hora_inicio
          AND estado IN ('Agendado', 'En_taller', 'En_progreso')
    ) THEN
        RAISE EXCEPTION 'El horario seleccionado ya está ocupado';
    END IF;

    -- Calcular duración total de todos los servicios
    FOR v_servicio IN
        SELECT duracion_estimada FROM servicios WHERE id = ANY(p_servicios)
    LOOP
        v_duracion := v_servicio.duracion_estimada;
        IF v_duracion ~ 'hora' THEN
            v_valor := COALESCE(NULLIF(regexp_replace(v_duracion, '[^0-9.]', '', 'g'), ''), '1')::NUMERIC;
            v_total_minutos := v_total_minutos + (v_valor * 60)::INT;
        ELSE
            v_valor := COALESCE(NULLIF(regexp_replace(v_duracion, '[^0-9.]', '', 'g'), ''), '60')::NUMERIC;
            v_total_minutos := v_total_minutos + v_valor::INT;
        END IF;
    END LOOP;

    v_hora_fin := p_hora_inicio + (v_total_minutos || ' minutes')::INTERVAL;

    -- Insertar cita
    INSERT INTO citas ("fechaCita", "horaInicio", "horaFin", observaciones, "clienteId", "empleadoId", estado)
    VALUES (p_fecha_cita, p_hora_inicio, v_hora_fin, p_observaciones, p_cliente_id, p_empleado_id, 'Agendado')
    RETURNING id INTO v_cita_id;

    -- Insertar servicios
    INSERT INTO detalle_servicio ("citaId", "servicioId")
    SELECT v_cita_id, unnest(p_servicios);

    -- Notificar al worker de emails
    PERFORM pg_notify('cita_creada', jsonb_build_object(
        'cita_id', v_cita_id,
        'cliente_id', p_cliente_id,
        'fecha', p_fecha_cita,
        'hora_inicio', p_hora_inicio,
        'hora_fin', v_hora_fin
    )::TEXT);

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'hora_fin', v_hora_fin
    );
END;
$$;


-- ============================================================
-- MÓDULO: FACTURAS - Generar factura desde cita completada
-- ============================================================

CREATE OR REPLACE FUNCTION factura_generar(
    p_cita_id UUID,
    p_usuario_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_factura_id UUID;
    v_numero_factura TEXT;
    v_total NUMERIC(10,2);
    v_cliente_id UUID;
    v_servicio RECORD;
BEGIN
    -- Verificar cita completada
    SELECT "clienteId" INTO v_cliente_id FROM citas
    WHERE id = p_cita_id AND estado = 'Completado';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita no existe o no está completada';
    END IF;

    -- Verificar que no tenga factura
    IF EXISTS (SELECT 1 FROM factura WHERE "citaId" = p_cita_id) THEN
        RAISE EXCEPTION 'La cita ya tiene factura';
    END IF;

    -- Calcular total y generar número
    v_numero_factura := 'FAC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

    -- Insertar factura
    INSERT INTO factura ("numeroFactura", "citaId", "clienteId", "usuarioId", total)
    VALUES (v_numero_factura, p_cita_id, v_cliente_id, p_usuario_id, 0)
    RETURNING id INTO v_factura_id;

    -- Insertar detalles y calcular total
    v_total := 0;
    FOR v_servicio IN
        SELECT s.id, s.descripcion, s.costo
        FROM detalle_servicio ds
        JOIN servicios s ON ds."servicioId" = s.id
        WHERE ds."citaId" = p_cita_id
    LOOP
        INSERT INTO detalle_factura ("facturaId", "servicioId", descripcion, cantidad, "precioUnitario", subtotal)
        VALUES (v_factura_id, v_servicio.id, v_servicio.descripcion, 1, v_servicio.costo, v_servicio.costo);

        v_total := v_total + v_servicio.costo;
    END LOOP;

    IF v_total = 0 THEN
        RAISE EXCEPTION 'La cita no tiene servicios';
    END IF;

    -- Actualizar total
    UPDATE factura SET total = v_total WHERE id = v_factura_id;

    -- Cambiar cita a Entregado
    UPDATE citas SET estado = 'Entregado' WHERE id = p_cita_id;

    -- Registrar en historial
    INSERT INTO estado_trabajo (estado, "estadoAnterior", "citaId", "usuarioId")
    VALUES ('Entregado', 'Completado', p_cita_id, p_usuario_id);

    RETURN jsonb_build_object(
        'success', true,
        'factura_id', v_factura_id,
        'numero_factura', v_numero_factura,
        'total', v_total
    );
END;
$$;


-- ============================================================
-- MÓDULO: FACTURAS - Obtener factura con detalle
-- ============================================================

CREATE OR REPLACE FUNCTION factura_obtener(p_factura_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', f.id,
        'numero_factura', f."numeroFactura",
        'fecha_emision', f."fechaEmision",
        'total', f.total,
        'estado', f.estado,
        'cliente_nombre', u_cli."nombreCompleto",
        'cliente_email', u_cli.email,
        'generado_por', u_usr."nombreCompleto",
        'detalle', COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'descripcion', df.descripcion,
                'cantidad', df.cantidad,
                'precio_unitario', df."precioUnitario",
                'subtotal', df.subtotal
            )) FROM detalle_factura df WHERE df."facturaId" = f.id),
            '[]'::JSONB
        )
    ) INTO v_result
    FROM factura f
    JOIN cliente c ON f."clienteId" = c.id
    JOIN usuario u_cli ON c."usuarioId" = u_cli.id
    JOIN usuario u_usr ON f."usuarioId" = u_usr.id
    WHERE f.id = p_factura_id;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Factura no encontrada';
    END IF;

    RETURN v_result;
END;
$$;


-- ============================================================
-- MÓDULO: DASHBOARD - Estadísticas
-- ============================================================

CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_ingresos NUMERIC;
    v_total_citas INT;
    v_completados INT;
    v_en_proceso INT;
    v_pendientes INT;
    v_total_clientes INT;
    v_top_mecanico JSONB;
BEGIN
    SELECT COALESCE(SUM(total), 0) INTO v_ingresos FROM factura WHERE estado = 'emitida';

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE estado IN ('Completado', 'Entregado')),
        COUNT(*) FILTER (WHERE estado IN ('En_taller', 'En_progreso', 'En_revision')),
        COUNT(*) FILTER (WHERE estado = 'Agendado')
    INTO v_total_citas, v_completados, v_en_proceso, v_pendientes
    FROM citas;

    SELECT COUNT(*) INTO v_total_clientes FROM cliente;

    SELECT jsonb_build_object(
        'nombre', u."nombreCompleto",
        'trabajos', COUNT(*)
    ) INTO v_top_mecanico
    FROM citas c
    JOIN empleado e ON c."empleadoId" = e.id
    JOIN usuario u ON e."usuarioId" = u.id
    WHERE c.estado IN ('Completado', 'Entregado')
      AND EXTRACT(MONTH FROM c."fechaCita") = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM c."fechaCita") = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY e.id, u."nombreCompleto"
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'total_ingresos', v_ingresos,
        'total_citas', v_total_citas,
        'completados', v_completados,
        'en_proceso', v_en_proceso,
        'pendientes', v_pendientes,
        'total_clientes', v_total_clientes,
        'top_mecanico', v_top_mecanico
    );
END;
$$;


-- ============================================================
-- MÓDULO: DASHBOARD - Servicios recientes
-- ============================================================

CREATE OR REPLACE FUNCTION dashboard_recent_services()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(sub) FROM (
            SELECT
                c.id,
                c."fechaCita" AS fecha,
                c.estado,
                u_cli."nombreCompleto" AS cliente,
                u_emp."nombreCompleto" AS mecanico,
                COALESCE(
                    (SELECT STRING_AGG(s.descripcion, ', ') FROM detalle_servicio ds JOIN servicios s ON ds."servicioId" = s.id WHERE ds."citaId" = c.id),
                    ''
                ) AS servicios,
                COALESCE(
                    (SELECT SUM(s.costo) FROM detalle_servicio ds JOIN servicios s ON ds."servicioId" = s.id WHERE ds."citaId" = c.id),
                    0
                ) AS costo_total
            FROM citas c
            JOIN cliente cli ON c."clienteId" = cli.id
            JOIN usuario u_cli ON cli."usuarioId" = u_cli.id
            JOIN empleado emp ON c."empleadoId" = emp.id
            JOIN usuario u_emp ON emp."usuarioId" = u_emp.id
            ORDER BY c."fechaCita" DESC
            LIMIT 10
        ) sub
    );
END;
$$;


-- ============================================================
-- MÓDULO: HORARIOS - Obtener horarios disponibles
-- ============================================================

CREATE OR REPLACE FUNCTION horarios_disponibles(
    p_empleado_id UUID,
    p_fecha DATE,
    p_tipo_servicio TEXT DEFAULT 'ambos'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_dia_semana INT;
    v_horarios JSONB;
BEGIN
    v_dia_semana := EXTRACT(DOW FROM p_fecha)::INT;

    SELECT jsonb_agg(jsonb_build_object(
        'id', h.id,
        'hora_inicio', h."horaInicio",
        'hora_fin', h."horaFin",
        'tipo_servicio', h."tipoServicio",
        'disponible', NOT EXISTS (
            SELECT 1 FROM citas c
            WHERE c."empleadoId" = p_empleado_id
              AND c."fechaCita" = p_fecha
              AND c."horaInicio" = h."horaInicio"::TIME
              AND c.estado NOT IN ('Cancelado', 'Entregado')
        )
    ) ORDER BY h."horaInicio")
    INTO v_horarios
    FROM horarios_empleado h
    WHERE h."empleadoId" = p_empleado_id
      AND h."diaSemana" = v_dia_semana
      AND h.activo = true
      AND (p_tipo_servicio = 'ambos' OR h."tipoServicio"::TEXT IN (p_tipo_servicio, 'ambos'));

    RETURN COALESCE(v_horarios, '[]'::JSONB);
END;
$$;


-- ============================================================
-- MÓDULO: HORARIOS - Días disponibles del mes
-- ============================================================

CREATE OR REPLACE FUNCTION dias_disponibles(
    p_empleado_id UUID,
    p_tipo_servicio TEXT DEFAULT 'ambos',
    p_mes INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT,
    p_anio INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_dias JSONB;
BEGIN
    SELECT jsonb_agg(DISTINCT h."diaSemana" ORDER BY h."diaSemana")
    INTO v_dias
    FROM horarios_empleado h
    WHERE h."empleadoId" = p_empleado_id
      AND h.activo = true
      AND (p_tipo_servicio = 'ambos' OR h."tipoServicio"::TEXT IN (p_tipo_servicio, 'ambos'));

    RETURN COALESCE(v_dias, '[]'::JSONB);
END;
$$;


-- ============================================================
-- MÓDULO: PRE-RESERVAS - Crear pre-reserva con token
-- ============================================================

CREATE OR REPLACE FUNCTION pre_reserva_crear(
    p_nombre_completo TEXT,
    p_telefono TEXT,
    p_email TEXT,
    p_tipo_servicio TEXT,
    p_fecha_cita DATE,
    p_hora_cita TIME,
    p_marca_vehiculo TEXT DEFAULT NULL,
    p_modelo_vehiculo TEXT DEFAULT NULL,
    p_anio_vehiculo INT DEFAULT NULL,
    p_placa TEXT DEFAULT NULL,
    p_descripcion_problema TEXT DEFAULT NULL,
    p_empleado_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_token TEXT;
    v_pre_reserva_id UUID;
BEGIN
    v_token := UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 32));

    INSERT INTO pre_reserva (
        "nombreCompleto", telefono, email, "tipoServicio",
        "fechaCita", "horaCita", "marcaVehiculo", "modeloVehiculo",
        "anioVehiculo", placa, "descripcionProblema",
        "empleadoId", "tokenVerificacion", "expiracionVerificacion"
    ) VALUES (
        p_nombre_completo, p_telefono, p_email, p_tipo_servicio,
        p_fecha_cita, p_hora_cita, p_marca_vehiculo, p_modelo_vehiculo,
        p_anio_vehiculo, p_placa, p_descripcion_problema,
        p_empleado_id, v_token, NOW() + INTERVAL '24 hours'
    ) RETURNING id INTO v_pre_reserva_id;

    -- Notificar al worker de emails
    PERFORM pg_notify('pre_reserva_creada', jsonb_build_object(
        'pre_reserva_id', v_pre_reserva_id,
        'email', p_email,
        'nombre', p_nombre_completo,
        'token', v_token
    )::TEXT);

    RETURN jsonb_build_object(
        'success', true,
        'pre_reserva_id', v_pre_reserva_id,
        'token', v_token,
        'message', 'Pre-reserva creada. Revisa tu correo para verificarla.'
    );
END;
$$;


-- ============================================================
-- MÓDULO: PRE-RESERVAS - Verificar token
-- ============================================================

CREATE OR REPLACE FUNCTION pre_reserva_verificar_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_pre_reserva RECORD;
BEGIN
    SELECT * INTO v_pre_reserva
    FROM pre_reserva
    WHERE "tokenVerificacion" = p_token
      AND estado = 'PENDIENTE'
      AND ("expiracionVerificacion" IS NULL OR "expiracionVerificacion" > NOW());

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido o expirado');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'pre_reserva', row_to_json(v_pre_reserva)
    );
END;
$$;


-- ============================================================
-- MÓDULO: PRE-RESERVAS - Confirmar y crear cita
-- ============================================================

CREATE OR REPLACE FUNCTION pre_reserva_confirmar(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_pre RECORD;
    v_usuario_id UUID;
    v_cliente_id UUID;
    v_cita_id UUID;
BEGIN
    SELECT * INTO v_pre
    FROM pre_reserva
    WHERE "tokenVerificacion" = p_token
      AND estado = 'PENDIENTE'
      AND ("expiracionVerificacion" IS NULL OR "expiracionVerificacion" > NOW());

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido o expirado');
    END IF;

    -- Buscar o crear usuario + cliente
    SELECT u.id INTO v_usuario_id FROM usuario u WHERE u.email = v_pre.email;

    IF NOT FOUND THEN
        -- Crear usuario sin password (deberá establecerlo después)
        INSERT INTO usuario ("nombreCompleto", email, telefono, password, "rolId")
        VALUES (v_pre."nombreCompleto", v_pre.email, v_pre.telefono, 'PENDIENTE', '3')
        RETURNING id INTO v_usuario_id;

        INSERT INTO cliente ("usuarioId") VALUES (v_usuario_id) RETURNING id INTO v_cliente_id;
    ELSE
        SELECT c.id INTO v_cliente_id FROM cliente c WHERE c."usuarioId" = v_usuario_id;
    END IF;

    -- Crear cita
    INSERT INTO citas ("fechaCita", "horaInicio", "clienteId", "empleadoId", estado, "tipoServicio")
    VALUES (v_pre."fechaCita", v_pre."horaCita", v_cliente_id, v_pre."empleadoId", 'Agendado', v_pre."tipoServicio"::"TipoServicio")
    RETURNING id INTO v_cita_id;

    -- Actualizar pre-reserva
    UPDATE pre_reserva
    SET estado = 'CONFIRMADA', "clienteId" = v_cliente_id, "usuarioId" = v_usuario_id, "citaId" = v_cita_id
    WHERE id = v_pre.id;

    -- Notificar al worker de emails
    PERFORM pg_notify('cita_creada', jsonb_build_object(
        'cita_id', v_cita_id,
        'cliente_id', v_cliente_id,
        'fecha', v_pre."fechaCita",
        'hora_inicio', v_pre."horaCita"
    )::TEXT);

    RETURN jsonb_build_object(
        'success', true,
        'cita_id', v_cita_id,
        'usuario_id', v_usuario_id,
        'message', 'Cita confirmada exitosamente'
    );
END;
$$;


-- ============================================================
-- MÓDULO: PRE-RESERVAS - Verificar disponibilidad
-- ============================================================

CREATE OR REPLACE FUNCTION disponibilidad_verificar(
    p_fecha DATE,
    p_hora TIME,
    p_empleado_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_disponible BOOLEAN;
BEGIN
    IF p_empleado_id IS NOT NULL THEN
        SELECT NOT EXISTS (
            SELECT 1 FROM citas
            WHERE "empleadoId" = p_empleado_id
              AND "fechaCita" = p_fecha
              AND "horaInicio" = p_hora
              AND estado NOT IN ('Cancelado', 'Entregado')
        ) INTO v_disponible;
    ELSE
        SELECT NOT EXISTS (
            SELECT 1 FROM citas
            WHERE "fechaCita" = p_fecha
              AND "horaInicio" = p_hora
              AND estado NOT IN ('Cancelado', 'Entregado')
        ) INTO v_disponible;
    END IF;

    RETURN jsonb_build_object('disponible', v_disponible);
END;
$$;


-- ============================================================
-- MÓDULO: USUARIOS - Activar/desactivar
-- ============================================================

CREATE OR REPLACE FUNCTION usuario_toggle_activo(p_usuario_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_nuevo_estado BOOLEAN;
BEGIN
    UPDATE usuario SET estado = NOT estado WHERE id = p_usuario_id
    RETURNING estado INTO v_nuevo_estado;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    RETURN jsonb_build_object('success', true, 'estado', v_nuevo_estado);
END;
$$;


-- ============================================================
-- MÓDULO: ROLES - Asignar permisos
-- ============================================================

CREATE OR REPLACE FUNCTION rol_asignar_permisos(
    p_rol_id UUID,
    p_permiso_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rol WHERE id = p_rol_id) THEN
        RAISE EXCEPTION 'Rol no encontrado';
    END IF;

    -- Validar que todos los permisos existan
    IF EXISTS (
        SELECT unnest(p_permiso_ids) AS pid
        WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE id = pid)
    ) THEN
        RAISE EXCEPTION 'Uno o más permisos no existen';
    END IF;

    -- Reemplazar asignaciones
    DELETE FROM detalle_permiso WHERE "rolId" = p_rol_id;

    INSERT INTO detalle_permiso ("rolId", "permisoId")
    SELECT p_rol_id, unnest(p_permiso_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Permisos asignados correctamente');
END;
$$;


-- ============================================================
-- MÓDULO: CLIENTES - Buscar por nombre
-- ============================================================

CREATE OR REPLACE FUNCTION cliente_buscar(p_nombre TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id', c.id,
            'nombre', u."nombreCompleto",
            'email', u.email,
            'telefono', u.telefono
        )) FROM cliente c
        JOIN usuario u ON c."usuarioId" = u.id
        WHERE u."nombreCompleto" ILIKE '%' || p_nombre || '%'),
        '[]'::JSONB
    );
END;
$$;


-- ============================================================
-- MÓDULO: CLIENTES - Citas del cliente
-- ============================================================

CREATE OR REPLACE FUNCTION cliente_citas(p_cliente_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id', c.id,
            'fecha', c."fechaCita",
            'hora_inicio', c."horaInicio",
            'hora_fin', c."horaFin",
            'estado', c.estado,
            'observaciones', c.observaciones,
            'mecanico', u."nombreCompleto",
            'servicios', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'id', s.id,
                    'descripcion', s.descripcion,
                    'costo', s.costo
                )) FROM detalle_servicio ds
                JOIN servicios s ON ds."servicioId" = s.id
                WHERE ds."citaId" = c.id
            ), '[]'::JSONB)
        ) ORDER BY c."fechaCita" DESC)
        FROM citas c
        JOIN empleado e ON c."empleadoId" = e.id
        JOIN usuario u ON e."usuarioId" = u.id
        WHERE c."clienteId" = p_cliente_id),
        '[]'::JSONB
    );
END;
$$;


-- ============================================================
-- MÓDULO: CITAS - Listar para admin (con todo el detalle)
-- ============================================================

CREATE OR REPLACE FUNCTION cita_listar_admin()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id', c.id,
            'fecha', c."fechaCita",
            'hora_inicio', c."horaInicio",
            'hora_fin', c."horaFin",
            'estado', c.estado,
            'observaciones', c.observaciones,
            'cliente', (SELECT jsonb_build_object('id', cli.id, 'nombre', u_cli."nombreCompleto", 'email', u_cli.email)
                       FROM cliente cli JOIN usuario u_cli ON cli."usuarioId" = u_cli.id WHERE cli.id = c."clienteId"),
            'mecanico', (SELECT jsonb_build_object('id', emp.id, 'nombre', u_emp."nombreCompleto")
                        FROM empleado emp JOIN usuario u_emp ON emp."usuarioId" = u_emp.id WHERE emp.id = c."empleadoId"),
            'servicios', COALESCE((
                SELECT jsonb_agg(jsonb_build_object('id', s.id, 'descripcion', s.descripcion, 'costo', s.costo))
                FROM detalle_servicio ds JOIN servicios s ON ds."servicioId" = s.id WHERE ds."citaId" = c.id
            ), '[]'::JSONB),
            'factura', (SELECT jsonb_build_object('id', f.id, 'numero', f."numeroFactura", 'total', f.total)
                       FROM factura f WHERE f."citaId" = c.id LIMIT 1)
        ) ORDER BY c."fechaCita" DESC, c."horaInicio" DESC)
        FROM citas c),
        '[]'::JSONB
    );
END;
$$;


-- ============================================================
-- MÓDULO: INVENTARIO - Stock bajo (alertas)
-- ============================================================

CREATE OR REPLACE FUNCTION inventario_stock_bajo()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'id', i.id,
            'codigo', i.codigo,
            'nombre', i.nombre,
            'stock_actual', i."stockActual",
            'stock_minimo', i."stockMinimo",
            'categoria', i.categoria,
            'proveedor', p.nombre,
            'precio_venta', i."precioVenta"
        ) ORDER BY (i."stockMinimo" - i."stockActual") DESC)
        FROM inventario i
        LEFT JOIN proveedor p ON i."proveedorId" = p.id
        WHERE i.estado = true AND i."stockActual" <= i."stockMinimo"),
        '[]'::JSONB
    );
END;
$$;

-- ============================================================
-- MÓDULO: INVENTARIO - Resumen del dashboard
-- ============================================================

CREATE OR REPLACE FUNCTION inventario_resumen()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_items INT;
    v_total_valor DECIMAL;
    v_items_stock_bajo INT;
    v_categorias JSONB;
BEGIN
    SELECT COUNT(*), COALESCE(SUM("stockActual" * "precioCompra"), 0)
    INTO v_total_items, v_total_valor
    FROM inventario WHERE estado = true;

    SELECT COUNT(*) INTO v_items_stock_bajo
    FROM inventario WHERE estado = true AND "stockActual" <= "stockMinimo";

    SELECT jsonb_agg(jsonb_build_object(
        'categoria', categoria,
        'total', COUNT(*),
        'stock_total', SUM("stockActual")
    )) INTO v_categorias
    FROM inventario WHERE estado = true
    GROUP BY categoria ORDER BY categoria;

    RETURN jsonb_build_object(
        'total_items', v_total_items,
        'valor_inventario', v_total_valor,
        'items_stock_bajo', v_items_stock_bajo,
        'categorias', COALESCE(v_categorias, '[]'::JSONB)
    );
END;
$$;

-- ============================================================
-- MÓDULO: INVENTARIO - Registrar movimiento
-- ============================================================

CREATE OR REPLACE FUNCTION inventario_movimiento(
    p_inventario_id UUID,
    p_tipo TEXT,
    p_cantidad INT,
    p_usuario_id UUID,
    p_cita_id UUID DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock_actual INT;
    v_stock_nuevo INT;
BEGIN
    IF p_tipo NOT IN ('entrada', 'salida', 'ajuste') THEN
        RAISE EXCEPTION 'Tipo de movimiento inválido: %', p_tipo;
    END IF;

    SELECT "stockActual" INTO v_stock_actual FROM inventario WHERE id = p_inventario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repuesto no encontrado';
    END IF;

    CASE p_tipo
        WHEN 'entrada' THEN v_stock_nuevo := v_stock_actual + p_cantidad;
        WHEN 'salida' THEN
            IF v_stock_actual < p_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente: actual %, requerido %', v_stock_actual, p_cantidad;
            END IF;
            v_stock_nuevo := v_stock_actual - p_cantidad;
        WHEN 'ajuste' THEN v_stock_nuevo := p_cantidad;
    END CASE;

    UPDATE inventario SET "stockActual" = v_stock_nuevo WHERE id = p_inventario_id;

    INSERT INTO movimiento_inventario ("inventarioId", tipo, cantidad, "stockAnterior", "stockNuevo", "citaId", "usuarioId", observaciones)
    VALUES (p_inventario_id, p_tipo, p_cantidad, v_stock_actual, v_stock_nuevo, p_cita_id, p_usuario_id, p_observaciones);

    RETURN jsonb_build_object(
        'success', true,
        'stock_anterior', v_stock_actual,
        'stock_nuevo', v_stock_nuevo
    );
END;
$$;

-- ============================================================
-- MÓDULO: INVENTARIO - Usar repuestos en una cita
-- ============================================================

CREATE OR REPLACE FUNCTION inventario_usar_en_cita(
    p_cita_id UUID,
    p_inventario_id UUID,
    p_cantidad INT,
    p_precio_unitario DECIMAL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock_actual INT;
    v_subtotal DECIMAL;
BEGIN
    SELECT "stockActual" INTO v_stock_actual FROM inventario WHERE id = p_inventario_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Repuesto no encontrado';
    END IF;

    IF v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente: actual %, requerido %', v_stock_actual, p_cantidad;
    END IF;

    v_subtotal := p_cantidad * p_precio_unitario;

    INSERT INTO cita_repuestos ("citaId", "inventarioId", cantidad, "precioUnitario", subtotal)
    VALUES (p_cita_id, p_inventario_id, p_cantidad, p_precio_unitario, v_subtotal)
    ON CONFLICT ("citaId", "inventarioId")
    DO UPDATE SET cantidad = EXCLUDED.cantidad, "precioUnitario" = EXCLUDED."precioUnitario", subtotal = EXCLUDED.subtotal;

    UPDATE inventario SET "stockActual" = "stockActual" - p_cantidad WHERE id = p_inventario_id;

    INSERT INTO movimiento_inventario ("inventarioId", tipo, cantidad, "stockAnterior", "stockNuevo", "citaId", "usuarioId", observaciones)
    VALUES (p_inventario_id, 'salida', p_cantidad, v_stock_actual, v_stock_actual - p_cantidad, p_cita_id, '00000000-0000-0000-0000-000000000000', 'Usado en cita');

    RETURN jsonb_build_object('success', true, 'subtotal', v_subtotal);
END;
$$;

-- ============================================================
-- NOTA: El worker de Node escucha estos canales:
--   "cita_creada"        → enviar email de confirmación al cliente
--   "pre_reserva_creada" → enviar email con token de verificación
-- ============================================================
