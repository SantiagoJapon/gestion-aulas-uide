-- ============================================
-- MIGRACIÓN: Tabla historial_cargas
-- Sistema de Gestión de Aulas UIDE
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS historial_cargas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL, -- 'estudiantes', 'planificacion', etc.
  archivo_nombre VARCHAR(255) NOT NULL,
  registros_procesados INTEGER DEFAULT 0,
  estado VARCHAR(50) NOT NULL, -- 'completado', 'error', 'en_proceso'
  fecha_carga TIMESTAMP DEFAULT NOW(),
  detalles JSONB,
  usuario_id INTEGER REFERENCES usuarios(id),
  CONSTRAINT chk_estado CHECK (estado IN ('completado', 'error', 'en_proceso'))
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_cargas(tipo);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_cargas(fecha_carga DESC);
CREATE INDEX IF NOT EXISTS idx_historial_estado ON historial_cargas(estado);

-- Comentarios descriptivos
COMMENT ON TABLE historial_cargas IS 'Registro de todas las cargas de archivos Excel (estudiantes, planificaciones, etc.)';
COMMENT ON COLUMN historial_cargas.tipo IS 'Tipo de carga: estudiantes, planificacion, etc.';
COMMENT ON COLUMN historial_cargas.detalles IS 'JSON con detalles adicionales de la respuesta de n8n';
COMMENT ON COLUMN historial_cargas.registros_procesados IS 'Cantidad de registros procesados exitosamente';

-- Verificar que se creó correctamente
SELECT 'Tabla historial_cargas creada exitosamente' AS mensaje;
SELECT * FROM historial_cargas LIMIT 5;
