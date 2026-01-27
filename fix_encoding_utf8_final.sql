-- Corregir encoding UTF-8 mal codificado en uploads_carreras
-- Problema: Doble codificación UTF-8 (Ã­ en lugar de í)

-- 1. Ingeniería en Tecnologías de la Información
UPDATE uploads_carreras 
SET carrera = 'Ingeniería en Tecnologías de la Información'
WHERE id = 2;

-- 2. Psicología Clínica
UPDATE uploads_carreras 
SET carrera = 'Psicología Clínica'
WHERE id = 4;

-- 3. Administración de Empresas
UPDATE uploads_carreras 
SET carrera = 'Administración de Empresas'
WHERE id = 7;

-- 4. Comunicación
UPDATE uploads_carreras 
SET carrera = 'Comunicación'
WHERE id = 8;

-- 5. Educación
UPDATE uploads_carreras 
SET carrera = 'Educación'
WHERE id = 9;

-- Actualizar carrera_normalizada para búsquedas
UPDATE uploads_carreras 
SET carrera_normalizada = LOWER(
  TRANSLATE(
    carrera,
    'ÁÉÍÓÚáéíóúÑñ',
    'AEIOUaeiouNn'
  )
)
WHERE carrera_normalizada IS NULL OR carrera_normalizada = '';

-- Verificar resultado
SELECT id, carrera, activa FROM uploads_carreras ORDER BY id;
