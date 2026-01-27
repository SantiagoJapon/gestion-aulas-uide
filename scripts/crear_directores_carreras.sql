-- ============================================
-- SCRIPT: Crear Directores de Carrera - UIDE
-- Fecha: 2026-01-27
-- ============================================

-- 1. CREAR/ACTUALIZAR CARRERAS
-- ============================================

-- Insertar carreras si no existen (con normalización)
INSERT INTO carreras (carrera, carrera_normalizada, activa, created_at, updated_at)
VALUES
  ('Derecho', 'derecho', true, NOW(), NOW()),
  ('Informática', 'informatica', true, NOW(), NOW()),
  ('Arquitectura', 'arquitectura', true, NOW(), NOW()),
  ('Psicología', 'psicologia', true, NOW(), NOW()),
  ('Business', 'business', true, NOW(), NOW())
ON CONFLICT (carrera_normalizada)
DO UPDATE SET
  carrera = EXCLUDED.carrera,
  activa = true,
  updated_at = NOW();

-- 2. CREAR USUARIOS DIRECTORES
-- ============================================
-- Password por defecto para todos: "uide2024" (hash bcrypt)
-- Hash generado con bcrypt.hashSync('uide2024', 10)

-- Eliminar directores existentes si existen (para evitar duplicados)
DELETE FROM usuarios WHERE email IN (
  'raquel.veintimilla@uide.edu.ec',
  'lorena.conde@uide.edu.ec',
  'freddy.salazar@uide.edu.ec',
  'domenica.burneo@uide.edu.ec',
  'franklin.chacon@uide.edu.ec',
  'mercy.namicela@uide.edu.ec'
);

-- Insertar directores
INSERT INTO usuarios (
  nombre,
  apellido,
  email,
  password,
  rol,
  estado,
  carrera_director,
  created_at,
  updated_at
) VALUES
  -- Derecho: Mgs. Raquel Veintimilla
  (
    'Raquel',
    'Veintimilla',
    'raquel.veintimilla@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'derecho'),
    NOW(),
    NOW()
  ),

  -- Informática: Mgs. Lorena Conde
  (
    'Lorena',
    'Conde',
    'lorena.conde@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'informatica'),
    NOW(),
    NOW()
  ),

  -- Arquitectura: Mgs. Freddy Salazar
  (
    'Freddy',
    'Salazar',
    'freddy.salazar@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'arquitectura'),
    NOW(),
    NOW()
  ),

  -- Psicología: Mgs. Domenica Burneo
  (
    'Domenica',
    'Burneo',
    'domenica.burneo@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'psicologia'),
    NOW(),
    NOW()
  ),

  -- Business: Phd. Franklin Chacon (Director)
  (
    'Franklin',
    'Chacon',
    'franklin.chacon@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'business'),
    NOW(),
    NOW()
  ),

  -- Business: Mercy Namicela (Coordinadora - también con rol director para subir planificaciones)
  (
    'Mercy',
    'Namicela',
    'mercy.namicela@uide.edu.ec',
    '$2b$10$8F9xKqVZYKjH5eoZLXM8/.QzGvN4qB0XkBxLHCv6FGvJKE8W9hKWm',
    'director',
    'activo',
    (SELECT id FROM carreras WHERE carrera_normalizada = 'business'),
    NOW(),
    NOW()
  );

-- 3. VERIFICACIÓN
-- ============================================

-- Ver todas las carreras creadas
SELECT id, carrera, carrera_normalizada, activa FROM carreras ORDER BY carrera;

-- Ver todos los directores creados con sus carreras
SELECT
  u.id,
  u.nombre,
  u.apellido,
  u.email,
  u.rol,
  u.estado,
  c.carrera as carrera_asignada
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_director = c.id
WHERE u.rol = 'director'
ORDER BY c.carrera, u.apellido;

-- ============================================
-- CREDENCIALES DE ACCESO
-- ============================================
/*
TODOS LOS DIRECTORES TIENEN LA MISMA CONTRASEÑA TEMPORAL:
Password: uide2024

DIRECTORES CREADOS:
1. raquel.veintimilla@uide.edu.ec - Derecho
2. lorena.conde@uide.edu.ec - Informática
3. freddy.salazar@uide.edu.ec - Arquitectura
4. domenica.burneo@uide.edu.ec - Psicología
5. franklin.chacon@uide.edu.ec - Business
6. mercy.namicela@uide.edu.ec - Business (Coordinadora)

NOTA: Se recomienda que cada director cambie su contraseña después del primer acceso.
*/
