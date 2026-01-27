-- Corregir encoding usando códigos UTF-8 correctos

-- Ingeniería en Tecnologías de la Información
UPDATE uploads_carreras 
SET carrera = convert_from(decode('496e67656e69657269cc8161206en205465636e6f6c6f67c3ad6173206465206c6120496e666f726d616369c3b36e', 'hex'), 'UTF8')
WHERE id = 2;

-- Actualizar en usuarios
UPDATE usuarios 
SET carrera_director = (SELECT carrera FROM uploads_carreras WHERE id = 2)
WHERE id = 5;

-- Verificar
SELECT id, carrera FROM uploads_carreras WHERE id = 2;
SELECT id, nombre, carrera_director FROM usuarios WHERE id = 5;
