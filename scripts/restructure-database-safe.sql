-- ============================================
-- REESTRUCTURACIÓN SEGURA DE BASE DE DATOS
-- ============================================
-- Este script actualiza la estructura SIN perder datos importantes
-- Ejecutar DESPUÉS del backup

-- ============================================
-- 1. TABLAS QUE NO SE TOCAN (MANTENER)
-- ============================================
-- usuarios - Sistema de autenticación (1 usuario admin)
-- config - Configuraciones del sistema (3 registros)

-- Agregar carrera asignada a directores
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS carrera_director VARCHAR(100);

-- ============================================
-- 2. ACTUALIZAR TABLA estudiantes (NO eliminar)
-- ============================================
-- Agregar campos nuevos sin eliminar la tabla existente
ALTER TABLE estudiantes 
  ADD COLUMN IF NOT EXISTS student_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(200),
  ADD COLUMN IF NOT EXISTS sexo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS estado_en_escuela VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sede VARCHAR(100),
  ADD COLUMN IF NOT EXISTS escuela VARCHAR(100),
  ADD COLUMN IF NOT EXISTS toma_materias VARCHAR(10),
  ADD COLUMN IF NOT EXISTS materias_actuales INTEGER,
  ADD COLUMN IF NOT EXISTS nivel_actual VARCHAR(50),
  ADD COLUMN IF NOT EXISTS codigo_malla VARCHAR(100),
  ADD COLUMN IF NOT EXISTS malla VARCHAR(100),
  ADD COLUMN IF NOT EXISTS periodo_lectivo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ano_inicio INTEGER,
  ADD COLUMN IF NOT EXISTS periodo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS porcentaje_horas DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS porcentaje_creditos DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS term_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS jornada VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email_uide VARCHAR(200),
  ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100),
  ADD COLUMN IF NOT EXISTS canton VARCHAR(100),
  ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pais VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS edad INTEGER,
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100),
  ADD COLUMN IF NOT EXISTS idioma_preferido VARCHAR(5) DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ultima_carga_excel TIMESTAMP;

-- Actualizar nombre_completo si existe nombre
UPDATE estudiantes 
SET nombre_completo = COALESCE(nombre, '') 
WHERE nombre_completo IS NULL AND nombre IS NOT NULL;

-- Crear índices únicos si no existen
CREATE UNIQUE INDEX IF NOT EXISTS estudiantes_student_number_unique ON estudiantes(student_number) WHERE student_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS estudiantes_enrollment_number_unique ON estudiantes(enrollment_number) WHERE enrollment_number IS NOT NULL;

-- ============================================
-- 3. ACTUALIZAR TABLA reservas (NO crear reservas_aulas)
-- ============================================
-- Agregar campos nuevos a la tabla existente
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS tipo_reserva VARCHAR(50),
  ADD COLUMN IF NOT EXISTS usuario_tipo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER,
  ADD COLUMN IF NOT EXISTS fecha DATE,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP;

-- Si no existe fecha, calcularla desde dia
UPDATE reservas 
SET fecha = CURRENT_DATE 
WHERE fecha IS NULL;

-- Renombrar campos si es necesario para consistencia
-- (mantener ambos nombres por compatibilidad)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas' AND column_name = 'usuario_nombre') THEN
    -- Ya existe, no hacer nada
    NULL;
  END IF;
END $$;

-- ============================================
-- 4. RECREAR tabla clases (con backup)
-- ============================================
-- Primero hacer backup (ya hecho en script anterior)
-- Luego eliminar y recrear
DROP TABLE IF EXISTS distribucion CASCADE;
DROP TABLE IF EXISTS clases CASCADE;

CREATE TABLE clases (
  id SERIAL PRIMARY KEY,
  carrera VARCHAR(100),
  materia VARCHAR(200),
  ciclo VARCHAR(50),
  horario VARCHAR(100),
  dia VARCHAR(20),
  hora_inicio VARCHAR(20),
  hora_fin VARCHAR(20),
  modalidad VARCHAR(50),
  docente VARCHAR(200),
  num_estudiantes INTEGER,
  aula_sugerida VARCHAR(50),
  jornada VARCHAR(50),
  fecha VARCHAR(50),
  facultad VARCHAR(100),
  ciclo_archivo VARCHAR(50),
  nombre_archivo VARCHAR(200),
  fila_excel INTEGER,
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Recrear tabla distribucion
CREATE TABLE distribucion (
  id SERIAL PRIMARY KEY,
  clase_id INT REFERENCES clases(id),
  aula_id INT REFERENCES aulas(id),
  dia VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. ACTUALIZAR tabla planificaciones_cargadas
-- ============================================
ALTER TABLE planificaciones_cargadas
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estado_version VARCHAR(20) DEFAULT 'ACTUAL',
  ADD COLUMN IF NOT EXISTS reemplazada_por INTEGER REFERENCES planificaciones_cargadas(id),
  ADD COLUMN IF NOT EXISTS usuario_subio VARCHAR(200),
  ADD COLUMN IF NOT EXISTS cambios_vs_anterior JSONB;

-- ============================================
-- 6. ACTUALIZAR tabla uploads_carreras
-- ============================================
ALTER TABLE uploads_carreras
  ADD COLUMN IF NOT EXISTS carrera_normalizada VARCHAR(120),
  ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE uploads_carreras
SET carrera_normalizada = LOWER(REGEXP_REPLACE(COALESCE(carrera, ''), '\s+', ' ', 'g'))
WHERE carrera_normalizada IS NULL;

-- Ya existe, solo asegurar que tenga los datos correctos
DELETE FROM uploads_carreras;
INSERT INTO uploads_carreras (carrera) VALUES
('Derecho'),
('Ingeniería en Tecnologías de la Información'),
('Arquitectura y Urbanismo'),
('Psicología Clínica'),
('Negocios Internacionales')
ON CONFLICT (carrera) DO NOTHING;

-- ============================================
-- 7. CREAR NUEVAS TABLAS (sin conflictos)
-- ============================================

-- Tabla para profesores
CREATE TABLE IF NOT EXISTS profesores (
  id SERIAL PRIMARY KEY,
  cedula VARCHAR(20) UNIQUE,
  nombre_completo VARCHAR(200) NOT NULL,
  email_institucional VARCHAR(200),
  facultad VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'ACTIVO'
);

-- Tabla para usuarios de Telegram (separada de usuarios del sistema)
CREATE TABLE IF NOT EXISTS usuarios_telegram (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(100),
  cedula VARCHAR(20),
  tipo VARCHAR(20),
  idioma_preferido VARCHAR(5) DEFAULT 'ES',
  ultima_interaccion TIMESTAMP DEFAULT NOW(),
  fecha_registro TIMESTAMP DEFAULT NOW()
);

-- Tabla para notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20),
  destinatario_email VARCHAR(200),
  asunto VARCHAR(200),
  mensaje TEXT,
  relacionado_con INTEGER,
  estado VARCHAR(20) DEFAULT 'PENDIENTE',
  fecha_envio TIMESTAMP,
  detalles_error TEXT
);

-- Tabla para solicitudes de auditorio
CREATE TABLE IF NOT EXISTS solicitudes_auditorio (
  id SERIAL PRIMARY KEY,
  director_nombre VARCHAR(200),
  director_email VARCHAR(200),
  facultad VARCHAR(100),
  fecha_solicitada DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  motivo TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDIENTE',
  aprobada_por VARCHAR(200),
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  fecha_respuesta TIMESTAMP,
  comentarios_admin TEXT
);

-- Tabla para directores de carrera
CREATE TABLE IF NOT EXISTS directores_carrera (
  id SERIAL PRIMARY KEY,
  facultad VARCHAR(100) UNIQUE NOT NULL,
  nombre_director VARCHAR(200) NOT NULL,
  titulo VARCHAR(50),
  email_institucional VARCHAR(200) NOT NULL,
  nombre_contacto_planificacion VARCHAR(200),
  email_contacto_planificacion VARCHAR(200),
  telefono VARCHAR(20),
  estado VARCHAR(20) DEFAULT 'ACTIVO',
  fecha_registro TIMESTAMP DEFAULT NOW(),
  ultima_actualizacion TIMESTAMP DEFAULT NOW()
);

-- Insertar directores
INSERT INTO directores_carrera 
(facultad, nombre_director, titulo, email_institucional, nombre_contacto_planificacion, email_contacto_planificacion) 
VALUES
('Derecho', 'Raquel Veintimilla', 'Mgs.', 'rveintimilla@uide.edu.ec', NULL, NULL),
('Informática', 'Lorena Conde', 'Mgs.', 'lconde@uide.edu.ec', NULL, NULL),
('Arquitectura', 'Freddy Salazar', 'Mgs.', 'fsalazar@uide.edu.ec', NULL, NULL),
('Psicología', 'Domenica Burneo', 'Mgs.', 'dburneo@uide.edu.ec', NULL, NULL),
('Business', 'Franklin Chacon', 'Phd.', 'fchacon@uide.edu.ec', 'Mercy Namicela', 'mnamicela@uide.edu.ec')
ON CONFLICT (facultad) DO UPDATE SET
  nombre_director = EXCLUDED.nombre_director,
  titulo = EXCLUDED.titulo,
  email_institucional = EXCLUDED.email_institucional,
  nombre_contacto_planificacion = EXCLUDED.nombre_contacto_planificacion,
  email_contacto_planificacion = EXCLUDED.email_contacto_planificacion,
  ultima_actualizacion = NOW();

-- Tabla para estadísticas (mapa de calor)
CREATE TABLE IF NOT EXISTS estadisticas_uso_aulas (
  id SERIAL PRIMARY KEY,
  aula_id INTEGER REFERENCES aulas(id),
  fecha DATE NOT NULL,
  hora INTEGER,
  total_reservas INTEGER DEFAULT 0,
  total_horas_ocupadas DECIMAL(4,2) DEFAULT 0,
  porcentaje_ocupacion DECIMAL(5,2),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(aula_id, fecha, hora)
);

-- ============================================
-- 8. VERIFICACIÓN FINAL
-- ============================================
SELECT 'Tablas creadas/actualizadas correctamente' as estado;

-- Listar todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;


