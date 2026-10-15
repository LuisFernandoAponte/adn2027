-- =============================================================================
-- ADN MOTORS — Funciones PostgreSQL para el sistema
-- =============================================================================
-- Ejecutar: \i database/functions.sql

-- ─────────────────────────────────────────────
-- 1. horarios_disponibles
-- Devuelve los horarios libres para un empleado y fecha
-- ─────────────────────────────────────────────
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
    SELECT he.horainicio::TIME, he.horafin::TIME
    FROM horarios_empleado he
    WHERE he.empleadoid = p_empleado_id
      AND he.diasemana = EXTRACT(DOW FROM p_fecha)
      AND he.activo = true
      AND (p_tipo_servicio IS NULL OR he.tiposervicio::TEXT = p_tipo_servicio)
  LOOP
    RETURN QUERY
    SELECT
      gs.hora::TIME AS hora_inicio,
      (gs.hora + INTERVAL '1 hour')::TIME AS hora_fin,
      NOT EXISTS (
        SELECT 1 FROM citas c
        WHERE c.empleadoid = p_empleado_id
          AND c.fechacita = p_fecha
          AND c.estado NOT IN ('Cancelado')
          AND c.horainicio::TIME <= gs.hora + INTERVAL '1 hour'
          AND c.horafin::TIME >= gs.hora
      ) AS disponible
    FROM generate_series(v_hora, v_fin - INTERVAL '1 hour', INTERVAL '1 hour') AS gs(hora)
    ORDER BY gs.hora;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 2. cita_agendar
-- Crea una cita con validaciones
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cita_agendar(
  p_cliente_id UUID,
  p_empleado_id UUID,
  p_fecha_cita DATE,
  p_hora_inicio TIME,
  p_hora_fin TIME,
  p_servicios UUID[],       -- Array de IDs de servicios
  p_observaciones TEXT DEFAULT NULL,
  p_tipo_servicio TEXT DEFAULT 'revision'
)
RETURNS JSON AS $$
DECLARE
  v_cita_id UUID;
  v_servicio_id UUID;
  v_conflicto INTEGER;
BEGIN
  -- Validar que el empleado existe
  IF NOT EXISTS (SELECT 1 FROM empleado WHERE id = p_empleado_id AND estado = true) THEN
    RETURN json_build_object('success', false, 'error', 'Empleado no encontrado o inactivo');
  END IF;

  -- Validar que el cliente existe
  IF NOT EXISTS (SELECT 1 FROM cliente WHERE id = p_cliente_id) THEN
    RETURN json_build_object('success', false, 'error', 'Cliente no encontrado');
  END IF;

  -- Validar que no haya conflicto de horario
  SELECT COUNT(*) INTO v_conflicto
  FROM citas
  WHERE empleadoid = p_empleado_id
    AND fechacita = p_fecha_cita
    AND estado NOT IN ('Cancelado')
    AND horainicio::TIME < p_hora_fin
    AND horafin::TIME > p_hora_inicio;

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

  -- Crear la cita
  INSERT INTO citas (fechacita, horainicio, horafin, observaciones, clienteid, empleadoid, estado, tiposervicio)
  VALUES (p_fecha_cita, p_hora_inicio::TIMESTAMP, p_hora_fin::TIMESTAMP, p_observaciones, p_cliente_id, p_empleado_id, 'Agendado', p_tipo_servicio::tiposervicio)
  RETURNING id INTO v_cita_id;

  -- Asignar servicios
  FOREACH v_servicio_id IN ARRAY p_servicios
  LOOP
    INSERT INTO detalle_servicio (citaid, servicioid) VALUES (v_cita_id, v_servicio_id)
    ON CONFLICT (citaid, servicioid) DO NOTHING;
  END LOOP;

  -- Notificar
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

-- ─────────────────────────────────────────────
-- 3. cita_cambiar_estado
-- Cambia el estado de una cita con auditoría
-- ─────────────────────────────────────────────
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

  UPDATE citas SET estado = p_nuevo_estado::estadocita WHERE id = p_cita_id;

  INSERT INTO estado_trabajo (estado, estadoanterior, citaid, usuarioid, observaciones, fechacambio)
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

-- ─────────────────────────────────────────────
-- 4. inventario_agregar_stock
-- Aumenta el stock de un repuesto con auditoría
-- ─────────────────────────────────────────────
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
BEGIN
  IF p_cantidad <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0');
  END IF;

  SELECT stockactual INTO v_stock_anterior
  FROM inventario WHERE id = p_inventario_id;

  IF v_stock_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Repuesto no encontrado');
  END IF;

  UPDATE inventario SET stockactual = stockactual + p_cantidad WHERE id = p_inventario_id
  RETURNING stockactual INTO v_stock_nuevo;

  INSERT INTO movimiento_inventario (inventarioid, tipo, cantidad, stockanterior, stocknuevo, usuarioid, observaciones)
  VALUES (p_inventario_id, 'entrada', p_cantidad, v_stock_anterior, v_stock_nuevo, p_usuario_id, p_observaciones);

  IF v_stock_nuevo <= (SELECT stockminimo FROM inventario WHERE id = p_inventario_id) THEN
    PERFORM pg_notify('alerta_stock', json_build_object(
      'inventario_id', p_inventario_id,
      'stock_actual', v_stock_nuevo,
      'stock_minimo', (SELECT stockminimo FROM inventario WHERE id = p_inventario_id)
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

-- ─────────────────────────────────────────────
-- 5. inventario_descontar_stock
-- Disminuye el stock de un repuesto con validación de disponibilidad
-- ─────────────────────────────────────────────
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
BEGIN
  IF p_cantidad <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'La cantidad debe ser mayor a 0');
  END IF;

  SELECT stockactual INTO v_stock_anterior
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

  UPDATE inventario SET stockactual = stockactual - p_cantidad WHERE id = p_inventario_id
  RETURNING stockactual INTO v_stock_nuevo;

  INSERT INTO movimiento_inventario (inventarioid, tipo, cantidad, stockanterior, stocknuevo, citaid, usuarioid, observaciones)
  VALUES (p_inventario_id, 'salida', p_cantidad, v_stock_anterior, v_stock_nuevo, p_cita_id, p_usuario_id, p_observaciones);

  IF v_stock_nuevo <= (SELECT stockminimo FROM inventario WHERE id = p_inventario_id) THEN
    PERFORM pg_notify('alerta_stock', json_build_object(
      'inventario_id', p_inventario_id,
      'stock_actual', v_stock_nuevo,
      'stock_minimo', (SELECT stockminimo FROM inventario WHERE id = p_inventario_id)
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
