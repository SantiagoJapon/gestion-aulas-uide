-- =============================================
-- CREAR MATERIAS DE PRUEBA
-- Sistema de Gestión de Aulas UIDE
-- =============================================
-- Ejecutar antes de subir el Excel de estudiantes

-- Verificar tabla clases
SELECT 'Verificando tabla clases...' as mensaje;
SELECT COUNT(*) as total_clases FROM clases;

-- Materias de Derecho Nivel 1
INSERT INTO clases (carrera_id, codigo_materia, nombre_materia, nivel, paralelo, numero_estudiantes, estado) 
VALUES 
(1, 'DER101', 'Introducción al Derecho', 1, 'A', 0, 'pendiente'),
(1, 'DER102', 'Derecho Romano', 1, 'A', 0, 'pendiente'),
(1, 'DER103', 'Derecho Constitucional', 1, 'A', 0, 'pendiente')
ON CONFLICT DO NOTHING;

-- Materias de Derecho Nivel 2
INSERT INTO clases (carrera_id, codigo_materia, nombre_materia, nivel, paralelo, numero_estudiantes, estado) 
VALUES 
(1, 'DER201', 'Derecho Civil I', 2, 'A', 0, 'pendiente'),
(1, 'DER202', 'Derecho Penal I', 2, 'A', 0, 'pendiente')
ON CONFLICT DO NOTHING;

-- Materias de Ingeniería (TICs) Nivel 1
INSERT INTO clases (carrera_id, codigo_materia, nombre_materia, nivel, paralelo, numero_estudiantes, estado) 
VALUES 
(2, 'ING201', 'Programación I', 1, 'A', 0, 'pendiente'),
(2, 'ING202', 'Base de Datos', 1, 'A', 0, 'pendiente')
ON CONFLICT DO NOTHING;

-- Materias de Arquitectura Nivel 1
INSERT INTO clases (carrera_id, codigo_materia, nombre_materia, nivel, paralelo, numero_estudiantes, estado) 
VALUES 
(3, 'ARQ101', 'Dibujo Técnico', 1, 'A', 0, 'pendiente')
ON CONFLICT DO NOTHING;

-- Verificar materias creadas
SELECT 'Materias creadas exitosamente:' as mensaje;
SELECT 
  carrera_id,
  codigo_materia,
  nombre_materia,
  nivel,
  paralelo
FROM clases
WHERE carrera_id IN (1, 2, 3)
ORDER BY carrera_id, nivel, codigo_materia;
