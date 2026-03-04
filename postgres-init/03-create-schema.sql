-- ============================================
-- SCHEMA COMPLETO PARA GESTIÓN DE AULAS UIDE
-- ============================================

-- Tabla de estudiantes (para autenticación)
CREATE TABLE IF NOT EXISTS estudiantes (
  id SERIAL PRIMARY KEY,
  cedula VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100),
  escuela VARCHAR(100),
  nivel VARCHAR(50),
  email VARCHAR(100),
  edad INT,
  telegram_id BIGINT,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cedula ON estudiantes(cedula);
CREATE INDEX IF NOT EXISTS idx_telegram ON estudiantes(telegram_id);

-- Tabla de uploads
CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  carrera VARCHAR(100) NOT NULL,
  file_path VARCHAR(255),
  file_name VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de carreras habilitadas para planificación
CREATE TABLE IF NOT EXISTS uploads_carreras (
  id SERIAL PRIMARY KEY,
  carrera VARCHAR(100) UNIQUE NOT NULL,
  carrera_normalizada VARCHAR(120),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de clases extraídas
CREATE TABLE IF NOT EXISTS clases (
  id SERIAL PRIMARY KEY,
  carrera VARCHAR(100),
  materia VARCHAR(100),
  ciclo VARCHAR(50),
  paralelo VARCHAR(10),
  dia VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  num_estudiantes INT,
  docente VARCHAR(100),
  aula_sugerida VARCHAR(50),
  modalidad VARCHAR(20)
);

-- Tabla de aulas disponibles
CREATE TABLE IF NOT EXISTS aulas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  capacidad INT NOT NULL,
  prioridad_carreras TEXT[], -- Array de carreras con prioridad
  edificio VARCHAR(50),
  tiene_proyector BOOLEAN DEFAULT false,
  es_laboratorio BOOLEAN DEFAULT false,
  estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'mantenimiento', 'no_disponible')),
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_aulas_edificio ON aulas(edificio);
CREATE INDEX IF NOT EXISTS idx_aulas_es_laboratorio ON aulas(es_laboratorio);
CREATE INDEX IF NOT EXISTS idx_aulas_estado ON aulas(estado);

-- Nota: Las aulas completas se insertan mediante el script seed-aulas.js
-- Este script se ejecuta con: npm run seed:aulas

-- Tabla de distribución final
CREATE TABLE IF NOT EXISTS distribucion (
  id SERIAL PRIMARY KEY,
  clase_id INT REFERENCES clases(id),
  aula_id INT REFERENCES aulas(id),
  dia VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas (esquema actual — compatible con el modelo Sequelize)
-- NOTA: Si la BD ya tiene la tabla con esquema viejo, ejecutar:
--   docker exec -it gestion_aulas_backend node /app/scripts/migrate-reservas.js
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  aula_codigo VARCHAR(50),
  espacio_codigo VARCHAR(50),
  dia VARCHAR(20) NOT NULL,
  fecha DATE,
  hora_inicio VARCHAR(10) NOT NULL,
  hora_fin VARCHAR(10) NOT NULL,
  motivo TEXT,
  estado VARCHAR(50) DEFAULT 'activa',
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  estudiante_id INT REFERENCES estudiantes(id) ON DELETE SET NULL,
  telefono VARCHAR(20),
  tipo_espacio VARCHAR(50) DEFAULT 'aula',
  es_grupal BOOLEAN DEFAULT false,
  num_personas INT DEFAULT 1,
  rol_usuario VARCHAR(50),
  solicitante_nombre VARCHAR(100),
  solicitante_cedula VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservas_aula_codigo ON reservas(aula_codigo);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario_id ON reservas(usuario_id);

-- Tabla de espacios (biblioteca, salas de estudio, cubículos, etc.)
CREATE TABLE IF NOT EXISTS espacios (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  capacidad INT NOT NULL,
  estado VARCHAR(50) DEFAULT 'DISPONIBLE',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE,
  valor TEXT,
  descripcion TEXT
);

-- Configuraciones iniciales (solo si no existen)
INSERT INTO config (clave, valor, descripcion) 
SELECT * FROM (VALUES
  ('num_carreras_esperadas', '10', 'Número de carreras que deben subir planificación'),
  ('fecha_limite', '2026-01-15', 'Fecha límite para uploads'),
  ('max_reservas_usuario', '2', 'Máximo de reservas por usuario por semana')
) AS v(clave, valor, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM config WHERE config.clave = v.clave);




