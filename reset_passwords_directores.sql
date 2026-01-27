-- ============================================
-- RESET PASSWORDS DIRECTORES
-- Password para todos: director123
-- ============================================

-- Hash bcrypt de "director123"
-- $2b$10$rKqX8LZm.YJ6vK9qYNZe7.8F/b5XGtJqvN8HvLj8Zm9L3Kq1Yq2K6

UPDATE usuarios 
SET password = '$2b$10$rKqX8LZm.YJ6vK9qYNZe7.8F/b5XGtJqvN8HvLj8Zm9L3Kq1Yq2K6'
WHERE rol = 'director';

-- Verificar
SELECT id, nombre, email, rol, carrera_director 
FROM usuarios 
WHERE rol = 'director'
ORDER BY id;

-- Ahora puedes hacer login con:
-- Email: lorenaaconde@uide.edu.ec
-- Password: director123
--
-- Email: raquel.veintimilla.director@uide.edu.ec
-- Password: director123
--
-- Email: lorena.conde.director@uide.edu.ec
-- Password: director123
--
-- Email: freddy.salazar.director@uide.edu.ec
-- Password: director123
