-- =============================================================================
-- ADN MOTORS — Script Unificado de Funciones y Reglas para Supabase
-- =============================================================================
-- Este archivo contiene todas las funciones PL/pgSQL, triggers y restricciones
-- requeridas para el funcionamiento 100% operativo en Supabase.
--
-- Instrucciones:
-- 1. En tu dashboard de Supabase, ve a "SQL Editor".
-- 2. Pega todo el contenido de este archivo y presiona "Run".
-- =============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Restricciones de Inventario y Movimientos
ALTER TABLE IF EXISTS inventario DROP CONSTRAINT IF EXISTS inventario_stock_actual_check;
ALTER TABLE IF EXISTS inventario ADD CONSTRAINT inventario_stock_actual_check CHECK ("stockActual" >= 0);

ALTER TABLE IF EXISTS inventario DROP CONSTRAINT IF EXISTS inventario_stock_minimo_check;
ALTER TABLE IF EXISTS inventario ADD CONSTRAINT inventario_stock_minimo_check CHECK ("stockMinimo" >= 0);

ALTER TABLE IF EXISTS inventario DROP CONSTRAINT IF EXISTS inventario_precio_compra_check;
ALTER TABLE IF EXISTS inventario ADD CONSTRAINT inventario_precio_compra_check CHECK ("precioCompra" >= 0);

ALTER TABLE IF EXISTS inventario DROP CONSTRAINT IF EXISTS inventario_precio_venta_check;
ALTER TABLE IF EXISTS inventario ADD CONSTRAINT inventario_precio_venta_check CHECK ("precioVenta" >= 0);

ALTER TABLE IF EXISTS movimiento_inventario DROP CONSTRAINT IF EXISTS movimiento_inventario_tipo_check;
ALTER TABLE IF EXISTS movimiento_inventario ADD CONSTRAINT movimiento_inventario_tipo_check CHECK (tipo IN ('entrada', 'salida', 'ajuste'));

-- 3. Función: horarios_disponibles
-- Retorna slots de 1 hora libres según horarios del empleado y citas existentes
CREATE OR REPLACE FUNCTION horarios_disponibles(
  p_empleado_id UUID,
  p_fecha DATE,
  p_tipo_servicio TEXT DEFAULT 'revision'
)
RETURNS TABLE (
  hora_inicio TIME,
  hora_fin TIME,
  disponible BOOLEAN
) AS $$
DECLARE
  v_hora TIME;
  v_fin TIME;
BEGIN
  FOR v_hora, v_fin IN
    SELECT he."horaInicio"::TIME, he."horaFin"::TIME
    FROM horarios_empleado he
    WHERE he."empleadoId" = p_empleado_id
      AND he."diaSemana" = EXTRACT(DOW FROM p_fecha)
      AND he.activo = true
      AND (p_tipo_servicio IS NULL OR he."tipoServicio"::TEXT = p_tipo_servicio)
  LOOP
    RETURN QUERY
    SELECT
      gs.hora::TIME AS hora_inicio,
      (gs.hora + INTERVAL '1 hour')::TIME AS hora_fin,
      NOT EXISTS (
        SELECT 1 FROM citas c
        WHERE c."empleadoId" = p_empleado_id
          AND c."fechaCita" = p_fecha
          AND c.estado NOT IN ('Cancelado')
          AND c."horaInicio"::TIME < (gs.hora + INTERVAL '1 hour')
          AND COALESCE(c."horaFin"::TIME, c."horaInicio"::TIME + INTERVAL '1 hour') > gs.hora
      ) AS disponible
    FROM generate_series(v_hora, v_fin - INTERVAL '1 hour', INTERVAL '1 hour') AS gs(hora)
    ORDER BY gs.hora;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Función: cita_agendar
-- Agendar citas con validación de conflictos y notificación
CREATE OR REPLACE FUNCTION cita_agendar(
  p_cliente_id UUID,
  p_empleado_id UUID,
  p_fecha_cita DATE,
  p_hora_inicio TIME,
  p_hora_fin TIME,
  p_servicios UUID[],
  p_observaciones TEXT DEFAULT NULL,
  p_tipo_servicio TEXT DEFAULT 'revision'
)
RETURNS JSON AS $$
DECLARE
  v_cita_id UUID;
  v_servicio_id UUID;
  v_conflicto INTEGER;
BEGIN
  -- Validar empleado
  IF NOT EXISTS (SELECT 1 FROM empleado WHERE id = p_empleado_id AND estado = true) THEN
    RETURN json_build_object('success', false, 'error', 'Empleado no encontrado o inactivo');
  END IF;

  -- Validar cliente
  IF NOT EXISTS (SELECT 1 FROM cliente WHERE id = p_cliente_id) THEN
    RETURN json_build_object('success', false, 'error', 'Cliente no encontrado');
  END IF;

  -- Validar conflicto de horario
  SELECT COUNT(*) INTO v_conflicto
  FROM citas
  WHERE "empleadoId" = p_empleado_id
    AND "fechaCita" = p_fecha_cita
    AND estado NOT IN ('Cancelado')
    AND "horaInicio"::TIME < p_hora_fin
    AND COALESCE("horaFin"::TIME, "horaInicio"::TIME + INTERVAL '1 hour') > p_hora_inicio;

  IF v_conflicto > 0 THEN
    RETURN json_build_object('success', false, 'error', 'El empleado ya tiene una cita en ese horario');
  END IF;

  -- Validar servicios
  IF array_length(p_servicios, 1) IS NULL OR array_length(p_servicios, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Debe seleccionar al menos un servicio');
  END IF;

  FOREACH v_servicio_id IN ARRAY p_servicios
  LOOP
    IF NOT EXISTS (SELECT 1 FROM servicios WHERE id = v_servicio_id AND estado = true) THEN
      RETURN json_build_object('success', false, 'error', 'Servicio no encontrado: ' || v_servicio_id);
    END IF;
  END LOOP;

  -- Insertar cita
  INSERT INTO citas ("fechaCita", "horaInicio", "horaFin", observaciones, "clienteId", "empleadoId", estado, "tipoServicio")
  VALUES (p_fecha_cita, p_hora_inicio::TIME, p_hora_fin::TIME, p_observaciones, p_cliente_id, p_empleado_id, 'Agendado', p_tipo_servicio::"TipoServicio")
  RETURNING id INTO v_cita_id;

  -- Asociar servicios
  FOREACH v_servicio_id IN ARRAY p_servicios
  LOOP
    INSERT INTO detalle_servicio ("citaId", "servicioId") VALUES (v_cita_id, v_servicio_id)
    ON CONFLICT ("citaId", "servicioId") DO NOTHING;
  END LOOP;

  -- Notificación pg_notify
  PERFORM pg_notify('cita_creada', json_build_object(
    'cita_id', v_cita_id,
    'cliente_id', p_cliente_id,
    'empleado_id', p_empleado_id,
    'fecha', p_fecha_cita,
    'hora_inicio', p_hora_inicio
  )::TEXT);

  RETURN json_build_object(
    'success', true,
    'message', 'Cita agendada exitosamente',
    'cita_id', v_cita_id
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Función: cita_cambiar_estado
-- Cambio de estado de cita con auditoría e historial
CREATE OR REPLACE FUNCTION cita_cambiar_estado(
  p_cita_id UUID,
  p_nuevo_estado TEXT,
  p_usuario_id UUID,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_estado_anterior TEXT;
  v_estados_validos TEXT[] := ARRAY['Agendado', 'En_taller', 'En_progreso', 'En_revision', 'Completado', 'Entregado', 'Cancelado'];
BEGIN
  IF NOT p_nuevo_estado = ANY(v_estados_validos) THEN
    RETURN json_build_object('success', false, 'error', 'Estado inválido: ' || p_nuevo_estado);
  END IF;

  SELECT estado::TEXT INTO v_estado_anterior
  FROM citas WHERE id = p_cita_id;

  IF v_estado_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cita no encontrada');
  END IF;

  UPDATE citas SET estado = p_nuevo_estado::"EstadoCita" WHERE id = p_cita_id;

  INSERT INTO estado_trabajo (estado, "estadoAnterior", "citaId", "usuarioId", observaciones, "fechaCambio")
  VALUES (p_nuevo_estado, v_estado_anterior, p_cita_id, p_usuario_id, p_observaciones, NOW());

  IF p_nuevo_estado = 'Completado' THEN
    PERFORM pg_notify('cita_completada', json_build_object(
      'cita_id', p_cita_id,
      'usuario_id', p_usuario_id
    )::TEXT);
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Estado actualizado de ' || COALESCE(v_estado_anterior, '?') || ' → ' || p_nuevo_estado,
    'estado_anterior', v_estado_anterior,
    'estado_nuevo', p_nuevo_estado
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Función: inventario_agregar_stock
CREATE OR REPLACE FUNCTION inventario_agregar_stock(
  p_inventario_id UUID,
  p_cantidad INTEGER,
  p_usuario_id UUID,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_stock_anterior INTEGER;
  v_stock_nuevo INTEGER;
  v_stock_minimo INTEGER;
BEGIN
  IF p_cantidad <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0');
  END IF;

  SELECT "stockActual", "stockMinimo" INTO v_stock_anterior, v_stock_minimo
  FROM inventario WHERE id = p_inventario_id;

  IF v_stock_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Repuesto no encontrado');
  END IF;

  UPDATE inventario SET "stockActual" = "stockActual" + p_cantidad WHERE id = p_inventario_id
  RETURNING "stockActual" INTO v_stock_nuevo;

  INSERT INTO movimiento_inventario ("inventarioId", tipo, cantidad, "stockAnterior", "stockNuevo", "usuarioId", observaciones)
  VALUES (p_inventario_id, 'entrada', p_cantidad, v_stock_anterior, v_stock_nuevo, p_usuario_id, p_observaciones);

  IF v_stock_nuevo <= v_stock_minimo THEN
    PERFORM pg_notify('alerta_stock', json_build_object(
      'inventario_id', p_inventario_id,
      'stock_actual', v_stock_nuevo,
      'stock_minimo', v_stock_minimo
    )::TEXT);
  END IF;

  RETURN json_build_object(
    'success', true,
    'stock_anterior', v_stock_anterior,
    'stock_nuevo', v_stock_nuevo,
    'cantidad_agregada', p_cantidad
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Función: inventario_descontar_stock
CREATE OR REPLACE FUNCTION inventario_descontar_stock(
  p_inventario_id UUID,
  p_cantidad INTEGER,
  p_usuario_id UUID,
  p_cita_id UUID DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_stock_anterior INTEGER;
  v_stock_nuevo INTEGER;
  v_stock_minimo INTEGER;
BEGIN
  IF p_cantidad <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0');
  END IF;

  SELECT "stockActual", "stockMinimo" INTO v_stock_anterior, v_stock_minimo
  FROM inventario WHERE id = p_inventario_id;

  IF v_stock_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Repuesto no encontrado');
  END IF;

  IF v_stock_anterior < p_cantidad THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Stock insuficiente. Disponible: ' || v_stock_anterior || ', solicitado: ' || p_cantidad
    );
  END IF;

  UPDATE inventario SET "stockActual" = "stockActual" - p_cantidad WHERE id = p_inventario_id
  RETURNING "stockActual" INTO v_stock_nuevo;

  INSERT INTO movimiento_inventario ("inventarioId", tipo, cantidad, "stockAnterior", "stockNuevo", "citaId", "usuarioId", observaciones)
  VALUES (p_inventario_id, 'salida', p_cantidad, v_stock_anterior, v_stock_nuevo, p_cita_id, p_usuario_id, p_observaciones);

  IF v_stock_nuevo <= v_stock_minimo THEN
    PERFORM pg_notify('alerta_stock', json_build_object(
      'inventario_id', p_inventario_id,
      'stock_actual', v_stock_nuevo,
      'stock_minimo', v_stock_minimo
    )::TEXT);
  END IF;

  RETURN json_build_object(
    'success', true,
    'stock_anterior', v_stock_anterior,
    'stock_nuevo', v_stock_nuevo,
    'cantidad_descontada', p_cantidad
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Función: pre_reserva_confirmar
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
    'cliente_id', v_cliente_id,
    'mensaje', 'Pre-reserva confirmada y convertida en cita exitosamente'
  );
END;
$$;

-- 9. Función: inventario_usar_en_cita
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
