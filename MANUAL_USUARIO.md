# Manual de Usuario — Sistema Inteligente de Gestión de Espacios Académicos (SIGEA-UIDE)

---

## 1. PORTADA Y DATOS DEL DOCUMENTO

**Sistema:** Sistema Inteligente de Gestión de Espacios Académicos (SIGEA-UIDE)  
**Versión del Sistema:** 2.5.0  
**Organización:** Universidad Internacional del Ecuador (UIDE), Sede Loja  
**Fecha de Elaboración:** 24 de febrero de 2026  
**Última Actualización:** 24 de febrero de 2026  
**Autor:** Departamento de Innovación Tecnológica — UIDE Loja  

### Historial de Revisiones
| Versión | Fecha | Autor | Cambios Realizados |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 10/01/2026 | Equipo Dev | Versión inicial del manual. |
| 2.0.0 | 15/02/2026 | UX Writing Dept | Rediseño de interfaz y nuevas funcionalidades de bot. |
| 2.5.0 | 24/02/2026 | UX Writing Dept | Inclusión de módulo de distribución maestra y asistente "Roomie". |

---

## 2. TABLA DE CONTENIDOS

1.  **PORTADA Y DATOS DEL DOCUMENTO**
2.  **TABLA DE CONTENIDOS**
3.  **INTRODUCCIÓN**
4.  **REQUISITOS PARA EL USO DEL SISTEMA**
5.  **ACCESO AL SISTEMA**
6.  **DESCRIPCIÓN DE LA INTERFAZ GENERAL**
7.  **MÓDULOS Y FUNCIONALIDADES DEL SISTEMA**
    *   7.1 Gestión de Aulas y Espacios
    *   7.2 Gestión de Docentes y Carreras
    *   7.3 Horarios y Planificaciones
    *   7.4 Distribución Inteligente de Espacios
    *   7.5 Reporte de Incidencias
8.  **ASISTENTE VIRTUAL "ROOMIE" (WHATSAPP)**
9.  **REPORTES E INFORMES**
10. **NOTIFICACIONES Y ALERTAS**
11. **CONFIGURACIÓN PERSONAL**
12. **PREGUNTAS FRECUENTES (FAQ)**
13. **SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)**
14. **GLOSARIO DE TÉRMINOS**
15. **SOPORTE Y CONTACTO**

---

## 3. INTRODUCCIÓN

### ¿Qué es SIGEA-UIDE?
Es una plataforma web inteligente diseñada para optimizar el uso de los espacios físicos (aulas, laboratorios, auditorios) de la UIDE Sede Loja. El sistema utiliza algoritmos avanzados para asignar automáticamente los mejores espacios según la cantidad de estudiantes, equipos necesarios y horarios académicos.

### ¿A quién está dirigido?
Este manual está diseñado para **Administradores**, **Directores de Carrera**, **Docentes** y **Estudiantes** de la comunidad UIDE. Cada perfil tiene acceso a funciones específicas adaptadas a sus necesidades.

### Simbología en este manual
⚠️ **Advertencia:** Información crítica para evitar errores o pérdida de datos.  
📝 **Nota:** Información adicional o aclaratoria importante.  
💡 **Consejo:** Trucos para usar el sistema de forma más eficiente.  
✅ **Paso completado:** Indica el resultado esperado de una acción.  
📸 **Captura:** Indica dónde visualizar una referencia visual del sistema.

---

## 4. REQUISITOS PARA EL USO DEL SISTEMA

Para garantizar una experiencia fluida, asegúrese de cumplir con los siguientes requisitos:

*   **Dispositivos:** Compatible con PC, Laptop, Tablets y Smartphones (Diseño Responsivo).
*   **Navegadores:** Google Chrome (Recomendado), Microsoft Edge, Safari o Firefox (versiones actualizadas).
*   **Conexión:** Acceso a internet estable (mínimo 5 Mbps).
*   **Permisos:** Debe poseer una cuenta activa institucional (@uide.edu.ec) o haber sido registrado por el administrador.
*   **Software adicional:** Visor de PDF para descargar reportes y Microsoft Excel para exportación de datos.

---

## 5. ACCESO AL SISTEMA

### 5.1 Pantalla de Inicio de Sesión
Para ingresar, diríjase a la URL proporcionada por la institución.

*   **Usuario/Email:** Ingrese su correo institucional o número de cédula.
*   **Contraseña:** Clave secreta asignada inicialmente.
*   **Botón "Ingresar":** Valida sus datos y le da acceso.

📸 [Captura de pantalla: Interfaz de Login con campos de Usuario y Contraseña]

### 5.2 Paso a paso para iniciar sesión
1.  Abra su navegador y escriba la dirección del sistema.
2.  Ingrese sus credenciales en los campos correspondientes.
3.  Haga clic en **"Entrar"**.
4.  Si es su primer ingreso, el sistema le pedirá cambiar su contraseña por seguridad.

⚠️ **Seguridad:** El sistema bloquea temporalmente la cuenta tras 5 intentos fallidos para proteger su información.

### 5.3 Recuperación de contraseña
Si olvidó su clave:
1.  Haga clic en **"¿Olvidó su contraseña?"** en la pantalla inicial.
2.  Ingrese su correo institucional.
3.  Recibirá un enlace de restablecimiento en su bandeja de entrada (revise la carpeta de Spam si no lo visualiza).

---

## 6. DESCRIPCIÓN DE LA INTERFAZ GENERAL

Una vez dentro, visualizará el **Dashboard Principal**. La interfaz está inspirada en un diseño limpio y moderno (tipo macOS) para facilitar la navegación.

1.  **Menú Lateral (Sidebar):** Permite navegar entre los módulos (Dashboard, Aulas, Docentes, Horarios, etc.). Puede ocultarse para ganar espacio en pantalla.
2.  **Barra Superior:** Muestra el nombre del usuario, notificaciones y el botón de búsqueda rápida.
3.  **Widgets Informativos:** Tarjetas con datos rápidos (Aulas ocupadas, reservas del día, alertas de incidencias).
4.  **Botones Comunes:**
    *   ➕ **Nuevo:** Crear un registro (Aula, Docente, etc.).
    *   🔍 **Filtro:** Buscar datos específicos por criterios.
    *   📥 **Exportar:** Descargar la lista actual en Excel o PDF.

📸 [Captura de pantalla: Dashboard principal con widgets y menú lateral desplegado]

---

## 7. MÓDULOS Y FUNCIONALIDADES

### 7.1 Gestión de Aulas y Espacios
Este módulo permite administrar cada espacio físico de la universidad.

*   **Consultar Aulas:** Visualice el listado de aulas con su capacidad, tipo (Laboratorio, Aula Común, Auditorio) y estado (Disponible/Ocupada).
*   **Código QR:** Cada aula tiene un código QR único. Puede imprimirlo para colocarlo en la puerta del aula; al escanearlo, los estudiantes verán el horario del día de ese espacio.
*   **Filtros Avanzados:** Busque aulas por capacidad (ej: "más de 30 personas") o por equipos (ej: "con proyector").

| Nombre del Campo | Tipo | Obligatorio | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| Código | Texto | Sí | Identificador único del aula | A-201 |
| Capacidad | Número | Sí | Cantidad máxima de personas | 45 |
| Tipo | Selección | Sí | Clase de espacio | LABORATORIO |

📸 [Captura de pantalla: Listado de aulas con botones de edición y descarga de QR]

### 7.2 Gestión de Docentes y Carreras
Módulo exclusivo para Administradores y Directores.

*   **Registro de Docentes:** Gestione nombres, correos y carga horaria.
*   **Carga Horaria:** Permite visualizar si un docente tiene conflictos de horario entre dos materias.
*   **Asignación de Materias:** Vincule docentes a materias específicas para el ciclo académico.

### 7.3 Distribución Inteligente (Master Distribution)
Esta es la función "cerebro" del sistema.

1.  **Carga de Datos:** Se importan los horarios base de las carreras.
2.  **Ejecución:** El Director presiona el botón **"Ejecutar Distribución Maestra"**.
3.  **Algoritmo:** El sistema asigna automáticamente el aula más cercana y con capacidad adecuada para cada clase, evitando choques.
4.  **Ajustes Manuales:** Después del proceso automático, el director puede mover una clase de aula manualmente si existe una necesidad especial.

⚠️ **Nota:** Esta acción solo puede realizarse una vez que todas las carreras han finalizado su planificación inicial.

---

## 8. ASISTENTE VIRTUAL "ROOMIE" (WHATSAPP)

SIGEA-UIDE incluye un bot inteligente llamado **Roomie** para facilitar consultas rápidas desde su móvil sin entrar a la web.

### ¿Cómo usar Roomie?
1.  Agregue el número institucional a sus contactos.
2.  Escriba **"Hola"** o **"Menu"**.
3.  **Identificación:** El bot le pedirá su número de cédula la primera vez.

### Funciones Principales:
*   **Buscar Aulas Libres:** Pregunte "Aulas libres ahora" o seleccione la opción en el menú.
*   **Consultar Horarios:** Envíe el nombre de una materia y Roomie le dirá en qué aula y a qué hora es la clase.
*   **Reservas Rápidas:** Si es docente, puede reservar un aula vacía por 1 hora directamente desde el chat.
*   **Ubicación de Docentes:** ¿Busca a un profesor? Roomie le dirá en qué aula está dictando clase en ese momento.

💡 **Consejo:** Roomie entiende audio. Puede enviar una nota de voz diciendo: *"¿Qué aula está libre hoy a las 11?"* y le responderá de inmediato.

---

## 9. REPORTES E INFORMES

Módulo para la toma de decisiones basada en datos.

*   **Mapa de Calor:** Visualización gráfica de qué áreas de la universidad están más congestionadas y en qué horarios.
*   **Reporte de Ocupación:** Gráficos de barras que muestran el porcentaje de uso de cada aula (ideal para justificar la creación de nuevos espacios).
*   **Exportación:** Todos los reportes pueden bajarse en **PDF** (presentación) o **Excel** (análisis de datos).

📸 [Captura de pantalla: Mapa de calor de ocupación de aulas por bloques]

---

## 10. REPORTE DE INCIDENCIAS

Si encuentra un problema en un aula, debe reportarlo inmediatamente:

1.  En el sistema (o escaneando el QR del aula), busque el botón **"Reportar Incidencia"**.
2.  Seleccione el tipo: *Proyector dañado, Falta de limpieza, Aire acondicionado, Mobiliario roto*.
3.  Adjunte una breve descripción.
4.  **Seguimiento:** El equipo de mantenimiento recibirá una alerta y el estado del reporte cambiará a "En Proceso" y finalmente "Solucionado".

---

## 11. PREGUNTAS FRECUENTES (FAQ)

**P: ¿Puedo entrar al sistema con mi cuenta personal de Gmail?**  
R: No, por seguridad solo se permiten correos electrónicos institucionales (@uide.edu.ec).

**P: ¿Qué pasa si intento reservar un aula que ya está ocupada?**  
R: El sistema no le permitirá seleccionarla. Las aulas ocupadas aparecen en color gris o rojo en el horario visual.

**P: ¿Cómo imprimo los códigos QR de las aulas?**  
R: En el módulo de Aulas, seleccione "Imprimir Todos los QR" o el icono de QR de un aula específica. Se generará un PDF listo para imprimir en tamaño carta o sticker.

**P: ¿Roomie bot tiene algún costo?**  
R: No, es un servicio gratuito para toda la comunidad UIDE.

**P: Soy docente y mi clase no aparece en el sistema, ¿qué hago?**  
R: Contacte con su Director de Carrera; es probable que la distribución de su carrera aún no haya sido "Publicada".

**P: ¿Puedo usar el sistema sin internet?**  
R: No, al ser una plataforma en la nube, requiere conexión constante para sincronizar las reservas en tiempo real.

**P: ¿Cómo cambio mi foto de perfil?**  
R: Vaya a "Configuración" > "Perfil" y haga clic sobre el avatar actual para cargar una imagen nueva.

**P: ¿El sistema funciona en iPhone?**  
R: Sí, es totalmente compatible con iOS a través de Safari.

---

## 12. SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING)

| Problema | Posible causa | Solución paso a paso |
| :--- | :--- | :--- |
| **No puedo iniciar sesión** | Credenciales incorrectas o cuenta bloqueada. | Verifique que su Bloq Mayús esté apagado. Si persiste, use "Olvidé mi contraseña". |
| **El mapa de calor no carga** | Los datos de la semana aún no se procesan. | Asegúrese de haber seleccionado un rango de fechas con clases activas. |
| **El código QR da error al escanear** | Cámara desenfocada o brillo de pantalla bajo. | Limpie el lente de su cámara o intente escanear desde la app de SIGEA directamente. |
| **Roomie no me responde** | El bot está en mantenimiento o no tiene señal. | Verifique si tiene internet en WhatsApp. Escriba "inicio" para reiniciar la conversación. |
| **No veo el botón de "Eliminar"** | Su rol no tiene permisos de edición. | Los docentes y estudiantes solo pueden visualizar; contacte a un Administrador si necesita borrar algo. |

---

## 13. SOPORTE Y CONTACTO

Si necesita ayuda técnica adicional:

*   **📧 Correo Electrónico:** soporte.it@uide.edu.ec
*   **📞 Teléfono:** (07) 257-XXXX Ext: 102
*   **📍 Oficina:** Bloque Administrativo, Planta Baja, Ventanilla de Soporte IT.
*   **⏰ Horario de Atención:** Lunes a Viernes de 08:00 a 18:00.

---

## 14. GLOSARIO DE TÉRMINOS

*   **Dashboard:** Panel principal de control con vista resumida.
*   **Distribución Maestra:** Proceso algorítmico que asigna aulas a todo el campus.
*   **Incidencia:** Cualquier desperfecto técnico o físico reportado en un aula.
*   **Responsivo:** Capacidad del sistema para adaptarse a cualquier tamaño de pantalla.
*   **Rol:** Nivel de acceso otorgado a un usuario (Admin, Director, Docente, Estudiante).

---

© 2026 Universidad Internacional del Ecuador. Todos los derechos reservados.
