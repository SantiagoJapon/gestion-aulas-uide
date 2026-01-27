-- Password hash para "DirectorUide2026!"
UPDATE usuarios 
SET password = '$2b$10$NpbPKQGhxJ4NNIfVBH48JeR.uBHevCaPb/TRZUHWooVwFpXfuMOVC'
WHERE id IN (4, 5, 6);

-- Verificar
SELECT id, nombre, apellido, email, LEFT(password, 30) as password_hash 
FROM usuarios 
WHERE id IN (4,5,6);
