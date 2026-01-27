-- Script para corregir la tabla aulas y agregar timestamps
-- Ejecutar este script antes de iniciar el servidor si hay errores de sincronización

-- Agregar columnas created_at y updated_at si no existen, con valores por defecto
DO $$
BEGIN
    -- Agregar created_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'aulas' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE aulas ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        -- Actualizar filas existentes con timestamp actual
        UPDATE aulas SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
        -- Ahora hacerlo NOT NULL
        ALTER TABLE aulas ALTER COLUMN created_at SET NOT NULL;
    END IF;

    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'aulas' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE aulas ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        -- Actualizar filas existentes con timestamp actual
        UPDATE aulas SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
        -- Ahora hacerlo NOT NULL
        ALTER TABLE aulas ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;

-- Verificar que las columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'aulas'
ORDER BY ordinal_position;



