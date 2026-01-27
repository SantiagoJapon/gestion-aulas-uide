-- ========================================
-- SCRIPT PARA CORREGIR ENCODING UTF-8
-- Sistema de Gestión de Aulas UIDE
-- ========================================

-- Actualizar la base de datos para usar UTF-8
ALTER DATABASE gestion_aulas SET client_encoding TO 'UTF8';

-- Corregir caracteres mal codificados en la tabla uploads_carreras
UPDATE uploads_carreras SET carrera = 
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    carrera,
    'Ã¡', 'á'), -- á
    'Ã©', 'é'), -- é
    'Ã­', 'í'), -- í
    'Ã³', 'ó'), -- ó
    'Ãº', 'ú'), -- ú
    'Ã±', 'ñ'), -- ñ
    'Ã', 'Á'),  -- Á
    'Ã‰', 'É'), -- É
    'Ã', 'Í'),  -- Í
    'Ã"', 'Ó'), -- Ó
    'Ãš', 'Ú'), -- Ú
    'Ã'', 'Ñ'), -- Ñ
    'Ã¼', 'ü'), -- ü
    'Ã', 'Ü'),  -- Ü
    'Ã', 'à'), -- à
    'Ã¨', 'è'), -- è
    'Ã¬', 'ì'), -- ì
    'Ã²', 'ò'), -- ò
    'Ã¹', 'ù'), -- ù
    'Ã€', 'À'), -- À
    'Ãˆ', 'È'), -- È
    'ÃŒ', 'Ì'), -- Ì
    'Ã'', 'Ò'), -- Ò
    'Ã™', 'Ù'), -- Ù
    'Â', ''),   -- Â extra
    'Ã', '')    -- Ã extra
WHERE carrera LIKE '%Ã%' OR carrera LIKE '%Â%';

-- Regenerar carrera_normalizada después de la corrección
UPDATE uploads_carreras SET carrera_normalizada = 
  LOWER(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      TRIM(
        REGEXP_REPLACE(carrera, '\s+', ' ', 'g')
      ),
      'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ñ', 'n'),
      'ü', 'u'), 'à', 'a'), 'è', 'e'), 'ì', 'i'), 'ò', 'o')
  );

-- Eliminar entradas inválidas
DELETE FROM uploads_carreras WHERE carrera IS NULL OR carrera = '' OR carrera = 'undefined';

-- Verificar resultados
SELECT 
  id, 
  carrera, 
  carrera_normalizada,
  activa
FROM uploads_carreras 
ORDER BY carrera;

-- Mostrar estadísticas
SELECT 
  COUNT(*) as total_carreras,
  COUNT(CASE WHEN activa = true THEN 1 END) as carreras_activas,
  COUNT(CASE WHEN activa = false THEN 1 END) as carreras_inactivas
FROM uploads_carreras;
