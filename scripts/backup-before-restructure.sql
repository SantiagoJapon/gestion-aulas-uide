-- ============================================
-- BACKUP ANTES DE REESTRUCTURAR BASE DE DATOS
-- ============================================
-- Ejecutar esto ANTES de hacer cambios importantes

-- Backup de datos importantes
CREATE TABLE IF NOT EXISTS backup_usuarios AS SELECT * FROM usuarios;
CREATE TABLE IF NOT EXISTS backup_clases AS SELECT * FROM clases;
CREATE TABLE IF NOT EXISTS backup_config AS SELECT * FROM config;
CREATE TABLE IF NOT EXISTS backup_aulas AS SELECT * FROM aulas;
CREATE TABLE IF NOT EXISTS backup_uploads_carreras AS SELECT * FROM uploads_carreras;

-- Verificar backups
SELECT 
  'backup_usuarios' as tabla, COUNT(*) as registros FROM backup_usuarios
UNION ALL
SELECT 'backup_clases', COUNT(*) FROM backup_clases
UNION ALL
SELECT 'backup_config', COUNT(*) FROM backup_config
UNION ALL
SELECT 'backup_aulas', COUNT(*) FROM backup_aulas
UNION ALL
SELECT 'backup_uploads_carreras', COUNT(*) FROM backup_uploads_carreras;


