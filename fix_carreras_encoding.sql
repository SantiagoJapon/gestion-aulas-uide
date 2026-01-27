-- ============================================
-- FIX: Corregir codificación de carreras
-- ============================================

-- Ver carreras actuales con problemas
SELECT id, nombre_carrera, estado FROM carreras_configuracion ORDER BY id;

-- Corregir nombres de carreras
UPDATE carreras_configuracion 
SET nombre_carrera = 'Ingeniería en Tecnologías de la Información y Comunicación'
WHERE id = 2;

UPDATE carreras_configuracion 
SET nombre_carrera = 'Psicología'
WHERE id = 5;

UPDATE carreras_configuracion 
SET nombre_carrera = 'Psicología Clínica'
WHERE id = 6;

-- Verificar correcciones
SELECT id, nombre_carrera, estado FROM carreras_configuracion ORDER BY id;
