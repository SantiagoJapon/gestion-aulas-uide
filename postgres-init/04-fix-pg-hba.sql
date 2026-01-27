-- Script para arreglar autenticación desde localhost
-- Este script se ejecuta automáticamente cuando se crea el contenedor

-- Permitir conexiones sin contraseña desde localhost (solo para desarrollo)
-- En producción, usa scram-sha-256

-- Comentar la línea que requiere scram-sha-256 para todas las conexiones
-- y agregar reglas específicas para localhost

-- Nota: Este archivo se ejecuta solo al crear el contenedor por primera vez
-- Para aplicarlo a un contenedor existente, ejecuta manualmente:

-- ALTER SYSTEM SET password_encryption = 'md5';
-- SELECT pg_reload_conf();






