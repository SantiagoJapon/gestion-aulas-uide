-- ============================================
-- SETUP: Directores de Carrera UIDE
-- ============================================

-- Ver estado actual
SELECT id, nombre, apellido, email, carrera_director 
FROM usuarios 
WHERE rol='director' 
ORDER BY id;

-- ============================================
-- RESETEAR CONTRASEÑAS
-- Password para todos: DirectorUide2026!
-- ============================================

-- Hash bcrypt de "DirectorUide2026!"
UPDATE usuarios 
SET password = '$2b$10$.LX7elJv5BFRYkJUdAB4jOG3tI2YaXt4PHuyDNkH0p1A52j21SBR2'
WHERE id IN (4, 5, 6);

-- ============================================
-- ASIGNAR CARRERAS
-- ============================================

-- Raquel Veintimilla → Derecho
UPDATE usuarios 
SET carrera_director = 'Derecho'
WHERE id = 4;

-- Lorena Conde → Informática (Ingeniería en TIC)
UPDATE usuarios 
SET carrera_director = 'Ingeniería en Tecnologías de la Información y Comunicación'
WHERE id = 5;

-- Freddy Salazar → Arquitectura
UPDATE usuarios 
SET carrera_director = 'Arquitectura y Urbanismo'
WHERE id = 6;

-- ============================================
-- VERIFICAR ASIGNACIONES
-- ============================================

SELECT 
  u.id,
  u.nombre,
  u.apellido,
  u.email,
  u.carrera_director,
  cc.id as carrera_id,
  cc.estado as carrera_estado
FROM usuarios u
LEFT JOIN carreras_configuracion cc ON cc.nombre_carrera = u.carrera_director
WHERE u.rol = 'director'
ORDER BY u.id;

-- ============================================
-- RESUMEN DE CREDENCIALES
-- ============================================

SELECT 
  '=== CREDENCIALES DE DIRECTORES ===' as info
UNION ALL
SELECT ''
UNION ALL
SELECT 'Password para todos: DirectorUide2026!'
UNION ALL
SELECT ''
UNION ALL
SELECT '1. DERECHO'
UNION ALL
SELECT '   Email: raquel.veintimilla.director@uide.edu.ec'
UNION ALL
SELECT '   Director: Mgs. Raquel Veintimilla'
UNION ALL
SELECT ''
UNION ALL
SELECT '2. INFORMÁTICA (Ingeniería en TIC)'
UNION ALL
SELECT '   Email: lorena.conde.director@uide.edu.ec'
UNION ALL
SELECT '   Director: Mgs. Lorena Conde'
UNION ALL
SELECT ''
UNION ALL
SELECT '3. ARQUITECTURA Y URBANISMO'
UNION ALL
SELECT '   Email: freddy.salazar.director@uide.edu.ec'
UNION ALL
SELECT '   Director: Mgs. Freddy Salazar';
