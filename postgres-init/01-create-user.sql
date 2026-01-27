-- Script de inicialización para PostgreSQL
-- Este script se ejecuta automáticamente cuando se crea el contenedor

-- PostgreSQL 15 usa scram-sha-256 por defecto (más seguro que MD5)
-- No necesitamos cambiar password_encryption

-- El usuario postgres ya existe por defecto en PostgreSQL
-- Solo otorgamos privilegios adicionales si es necesario
-- (El usuario postgres ya tiene todos los privilegios por defecto)
GRANT ALL PRIVILEGES ON DATABASE gestion_aulas TO postgres;
