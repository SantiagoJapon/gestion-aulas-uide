DELETE FROM uploads_carreras WHERE carrera = 'undefined';

UPDATE uploads_carreras SET carrera = 'Administración de Empresas', carrera_normalizada = 'administracion de empresas' WHERE id = 7;
UPDATE uploads_carreras SET carrera = 'Comunicación', carrera_normalizada = 'comunicacion' WHERE id = 8;
UPDATE uploads_carreras SET carrera = 'Educación', carrera_normalizada = 'educacion' WHERE id = 9;
UPDATE uploads_carreras SET carrera = 'Ingeniería en Tecnologías de la Información', carrera_normalizada = 'ingenieria en tecnologias de la informacion' WHERE id = 2;
UPDATE uploads_carreras SET carrera = 'Psicología Clínica', carrera_normalizada = 'psicologia clinica' WHERE id = 4;

SELECT id, carrera, carrera_normalizada, activa FROM uploads_carreras ORDER BY carrera;
