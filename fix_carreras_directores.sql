-- Actualizar los nombres de carrera de los directores para que coincidan con uploads_carreras

-- Lorena Conde (IDs 3 y 5) - Informática
UPDATE usuarios 
SET carrera_director = (SELECT carrera FROM uploads_carreras WHERE id = 2)
WHERE id IN (3, 5);

-- Freddy Salazar (ID 6) - Arquitectura
UPDATE usuarios 
SET carrera_director = (SELECT carrera FROM uploads_carreras WHERE id = 3)
WHERE id = 6;

-- Verificar resultado
SELECT 
  u.id, 
  u.nombre || ' ' || u.apellido as nombre_completo,
  u.email, 
  u.carrera_director,
  uc.id as carrera_id,
  uc.carrera as carrera_en_uploads,
  CASE 
    WHEN uc.id IS NOT NULL THEN '✓ MATCH'
    ELSE '✗ NO MATCH'
  END as estado
FROM usuarios u
LEFT JOIN uploads_carreras uc ON uc.carrera = u.carrera_director
WHERE u.rol = 'director'
ORDER BY u.id;
