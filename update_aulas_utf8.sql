-- Asegurar encoding UTF8
SET client_encoding = 'UTF8';

-- Limpiar tabla actual
TRUNCATE TABLE aulas CASCADE;

-- Insertar nuevas aulas (Asegurándonos de usar caracteres estándar)
INSERT INTO aulas (codigo, nombre, capacidad, estado, tipo, edificio) VALUES
('AUDITORIO', 'Auditorio', 55, 'disponible', 'Auditorio', 'Planta Baja'),
('LAB1', 'Laboratorio 1', 30, 'disponible', 'Laboratorio', 'Planta Baja'),
('LAB2', 'Laboratorio 2', 21, 'disponible', 'Laboratorio', 'Planta Baja'),
('LAB3', 'Laboratorio 3', 21, 'disponible', 'Laboratorio', 'Planta Baja'),
('B4', 'Aula B4', 24, 'disponible', 'Aula', 'Bloque B'),
('B8', 'Aula B8', 27, 'disponible', 'Aula', 'Bloque B'),
('AUDIENCIAS', 'Sala de Audiencias', 20, 'disponible', 'Sala', 'Bloque B'),
('B7', 'Aula B7', 27, 'disponible', 'Aula', 'Bloque B'),
('B6', 'Aula B6', 27, 'disponible', 'Aula', 'Bloque B'),
('B5', 'Aula B5', 62, 'disponible', 'Aula', 'Bloque B'),
('C10', 'Aula C10', 60, 'disponible', 'Aula', 'Bloque C'),
('C11', 'Aula C11', 27, 'disponible', 'Aula', 'Bloque C'),
('C12', 'Aula C12', 30, 'disponible', 'Aula', 'Bloque C'),
('C13', 'Aula C13', 27, 'disponible', 'Aula', 'Bloque C'),
('C14', 'Aula C14', 27, 'disponible', 'Aula', 'Bloque C'),
('AULA20', 'Aula 20 - Laboratorio de Psicología', 25, 'disponible', 'Laboratorio', 'Bloque C'),
('C19', 'Aula C19 - Papelería', 0, 'inactivo', 'Otro', 'Bloque C'),
('C18', 'Aula C18 - Arquitectura', 24, 'disponible', 'Aula', 'Bloque C'),
('C17', 'Aula C17 - Arquitectura', 24, 'disponible', 'Aula', 'Bloque C'),
('C15', 'Aula C15 - Arquitectura', 27, 'disponible', 'Aula', 'Bloque C'),
('C16', 'Aula C16 - Arquitectura', 24, 'disponible', 'Aula', 'Bloque C'),
('C21', 'Aula C21', 27, 'disponible', 'Aula', 'Bloque C'),
('C22', 'Aula C22', 27, 'disponible', 'Aula', 'Bloque C'),
('C23', 'Aula C23', 27, 'disponible', 'Aula', 'Bloque C');
