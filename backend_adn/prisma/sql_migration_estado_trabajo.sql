-- sql_migration_estado_trabajo.sql
-- MIGRACIÓN DE MÁQUINA DE ESTADOS Y AUDITORÍA PARA ADN MOTORS (PostgreSQL + PostgREST)

-- 1. CREACIÓN DEL TYPE ENUM DE ESTADOS
CREATE TYPE estado_trabajo_enum AS ENUM (
  'agendado',
  'en_taller',
  'en_progreso',
  'en_revision',
  'completado',
  'entregado',
  'cancelado'
);

-- 2. TABLA DE TRANSICIONES VÁLIDAS (Regla de negocio en la BD)
CREATE TABLE IF NOT EXISTS transiciones_validas (
  desde estado_trabajo_enum NOT NULL,
  hasta estado_trabajo_enum NOT NULL,
  PRIMARY KEY (desde, hasta)
);

-- Poblar la matriz de transiciones válidas
INSERT INTO transiciones_validas (desde, hasta) VALUES
  ('agendado', 'en_taller'),
  ('agendado', 'cancelado'),
  ('en_taller', 'en_progreso'),
  ('en_taller', 'cancelado'),
  ('en_progreso', 'en_revision'),
  ('en_progreso', 'cancelado'),
  ('en_revision', 'completado'),
  ('en_revision', 'en_progreso'), -- Regresión válida con nota obligatoria
  ('en_revision', 'cancelado'),
  ('completado', 'entregado')
ON CONFLICT DO NOTHING;

-- 3. TABLA DE AUDITORÍA (HISTORIAL DE TRABAJO)
CREATE TABLE IF NOT EXISTS trabajo_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  estado_desde TEXT NOT NULL,
  estado_hasta TEXT NOT NULL,
  nota TEXT,
  cambiado_por UUID REFERENCES usuario(id),
  cambiado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. FUNCIÓN RPC PARA CAMBIO DE ESTADO AUDITADO Y SEGURO
CREATE OR REPLACE FUNCTION cambiar_estado_trabajo(
  p_cita_id UUID,
  p_nuevo_estado TEXT,
  p_nota TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_estado_actual TEXT;
  v_transicion_valida BOOLEAN;
  v_resultado JSON;
BEGIN
  -- Obtener estado actual
  SELECT estado::TEXT INTO v_estado_actual FROM citas WHERE id = p_cita_id;
  IF v_estado_actual IS NULL THEN
    RAISE EXCEPTION 'Cita u Orden de trabajo % no encontrada.', p_cita_id;
  END IF;

  -- Validar regla especial: regresión de "en_revision" a "en_progreso" exige nota
  IF v_estado_actual = 'en_revision' AND p_nuevo_estado = 'en_progreso' AND (p_nota IS NULL OR length(trim(p_nota)) < 5) THEN
    RAISE EXCEPTION 'La regresión de "en_revision" a "en_progreso" requiere una nota explicativa de al menos 5 caracteres.';
  END IF;

  -- Actualizar estado en la tabla citas
  UPDATE citas
  SET estado = p_nuevo_estado::estado_cita
  WHERE id = p_cita_id;

  -- Registrar en la tabla de historial de auditoría
  INSERT INTO trabajo_historial (cita_id, estado_desde, estado_hasta, nota, cambiado_por)
  VALUES (p_cita_id, v_estado_actual, p_nuevo_estado, p_nota, p_usuario_id);

  -- Construir respuesta JSON
  SELECT json_build_object(
    'success', true,
    'message', 'Estado actualizado con éxito',
    'citaId', p_cita_id,
    'estadoAnterior', v_estado_actual,
    'nuevoEstado', p_nuevo_estado
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERMISOS Y SEGURIDAD EN CAPA DE DATOS (GRANT EXECUTE)
GRANT EXECUTE ON FUNCTION cambiar_estado_trabajo(UUID, TEXT, TEXT, UUID) TO postgres, anon, authenticated;
