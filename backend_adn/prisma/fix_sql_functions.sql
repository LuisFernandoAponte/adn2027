-- ============================================================
-- FIX: pre_reserva_confirmar - buscar rol Cliente dinámicamente
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
    v_rol_cliente_id UUID;
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
        SELECT id INTO v_rol_cliente_id FROM rol WHERE descripcion = 'Cliente';
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Rol Cliente no encontrado en el sistema');
        END IF;

        INSERT INTO usuario ("nombreCompleto", email, telefono, password, "rolId")
        VALUES (v_pre."nombreCompleto", v_pre.email, v_pre.telefono, 'PENDIENTE', v_rol_cliente_id)
        RETURNING id INTO v_usuario_id;

        INSERT INTO cliente ("usuarioId") VALUES (v_usuario_id) RETURNING id INTO v_cliente_id;
    ELSE
        SELECT c.id INTO v_cliente_id FROM cliente c WHERE c."usuarioId" = v_usuario_id;
    END IF;

    INSERT INTO citas ("fechaCita", "horaInicio", "clienteId", "empleadoId", estado, "tipoServicio")
    VALUES (v_pre."fechaCita", v_pre."horaCita", v_cliente_id, v_pre."empleadoId", 'Agendado', v_pre."tipoServicio"::"TipoServicio")
    RETURNING id INTO v_cita_id;

    UPDATE pre_reserva
    SET estado = 'CONFIRMADA', "clienteId" = v_cliente_id, "usuarioId" = v_usuario_id, "citaId" = v_cita_id
    WHERE id = v_pre.id;

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
-- FIX: inventario_usar_en_cita - recibir usuarioId como parámetro
-- ============================================================

CREATE OR REPLACE FUNCTION inventario_usar_en_cita(
    p_cita_id UUID,
    p_inventario_id UUID,
    p_cantidad INT,
    p_precio_unitario DECIMAL,
    p_usuario_id UUID DEFAULT NULL
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
    VALUES (p_inventario_id, 'salida', p_cantidad, v_stock_actual, v_stock_actual - p_cantidad, p_cita_id, COALESCE(p_usuario_id, (SELECT id FROM usuario LIMIT 1)), 'Usado en cita');

    RETURN jsonb_build_object('success', true, 'subtotal', v_subtotal);
END;
$$;
