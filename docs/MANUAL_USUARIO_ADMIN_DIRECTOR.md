# Manual de Usuario — Gestión de Directores y Planificación Multi-Carrera
## SIGEA-UIDE · Módulo de Administrador y Módulo de Director de Carrera

---

## Datos del documento

| Campo | Detalle |
| :--- | :--- |
| **Sistema** | Sistema Inteligente de Gestión de Espacios Académicos (SIGEA-UIDE) |
| **Alcance de este manual** | Administración de Directores de Carrera y Planificación Multi-Carrera |
| **Fecha de elaboración** | 21 de agosto de 2026 |
| **Método de verificación** | Cada paso descrito fue ejecutado y verificado automáticamente mediante pruebas end-to-end (Playwright) contra el sistema real, no simulado. |
| **Evidencia** | Ver [Sección 5 — Anexos y Evidencias](#5-anexos-y-evidencias) |

> **Nota sobre el alcance:** Este documento complementa al `MANUAL_USUARIO.md` general del sistema. Se enfoca exclusivamente en el ciclo de vida de los Directores de Carrera y en el flujo de planificación cuando un director gestiona **más de una carrera simultáneamente** — un escenario que requiere atención especial porque cada carrera mantiene sus propios datos de forma completamente independiente.

---

## Tabla de contenidos

1. [Introducción y Accesos](#1-introducción-y-accesos)
2. [Módulo de Administrador](#2-módulo-de-administrador)
   - 2.1 [Gestionar Directores de Carrera](#21-gestionar-directores-de-carrera)
   - 2.2 [Asignar un Director a una o varias Carreras](#22-asignar-un-director-a-una-o-varias-carreras)
   - 2.3 [Desvincular a un Director de una Carrera](#23-desvincular-a-un-director-de-una-carrera)
   - 2.4 [Eliminar la cuenta de un Director](#24-eliminar-la-cuenta-de-un-director)
   - 2.5 [Definir fechas límite de planificación por carrera](#25-definir-fechas-límite-de-planificación-por-carrera)
   - 2.6 [Verificar el estado de las distribuciones](#26-verificar-el-estado-de-las-distribuciones)
3. [Módulo de Director de Carrera](#3-módulo-de-director-de-carrera)
   - 3.1 [Ver las carreras asignadas](#31-ver-las-carreras-asignadas)
   - 3.2 [Subir la planificación — un recuadro independiente por carrera](#32-subir-la-planificación--un-recuadro-independiente-por-carrera)
   - 3.3 [Interpretar el Reporte de Salud de Datos](#33-interpretar-el-reporte-de-salud-de-datos)
   - 3.4 [Interpretar las alertas del panel principal](#34-interpretar-las-alertas-del-panel-principal)
4. [Preguntas frecuentes de este módulo](#4-preguntas-frecuentes-de-este-módulo)
5. [Anexos y Evidencias](#5-anexos-y-evidencias)

---

## 1. Introducción y Accesos

### 1.1 ¿Qué cubre este módulo?

SIGEA-UIDE permite que un mismo Director de Carrera sea responsable de **varias carreras a la vez** (por ejemplo, un director que dirige simultáneamente "Ingeniería en Software" e "Ingeniería en Redes"). Esto exige que el sistema:

- Mantenga la subida de horarios de cada carrera **completamente separada** — subir el Excel de una carrera nunca debe sobrescribir ni afectar los datos de otra.
- Permita al Administrador asignar y desvincular directores de carreras individuales sin afectar sus otras asignaciones.
- Permita definir una fecha límite de planificación distinta para cada carrera.

Este manual documenta paso a paso cómo el Administrador gestiona esos directores y cómo el Director experimenta el flujo de subida cuando tiene múltiples carreras a su cargo.

### 1.2 Roles involucrados

| Rol | Acceso a este módulo |
| :--- | :--- |
| **Administrador** | Control total: crea, asigna, desvincula y elimina directores; define fechas límite; consulta el estado de todas las carreras. |
| **Director de Carrera** | Ve únicamente las carreras que le fueron asignadas; sube y gestiona la planificación de cada una por separado. |

### 1.3 Cómo ingresar

1. Abra el navegador y diríjase a la URL del sistema (pantalla `/login`).
2. El formulario abre por defecto en modo **Docente** (correo + contraseña). Este mismo modo se usa para **Administrador** y **Director de Carrera** — ambos ingresan con correo institucional y contraseña.
3. Escriba su correo en el campo **Correo** y su contraseña en el campo **Contraseña**.
4. Presione **Iniciar Sesión**.
5. El sistema lo redirige automáticamente a su panel según su rol:
   - Administrador → `/admin`
   - Director de Carrera → `/director`

> ⚠️ **Primer ingreso de un Director recién creado:** si el Administrador acaba de crear su cuenta, el sistema **obliga** a cambiar la contraseña temporal antes de continuar (pantalla "Finalizar Configuración"). Ver [Sección 2.1](#21-gestionar-directores-de-carrera).

> ⚠️ **Credenciales incorrectas:** si el correo o la contraseña no coinciden, el sistema muestra un mensaje de error (por ejemplo *"Credenciales inválidas"*) y permanece en la pantalla de login. No se pierde ni se altera ningún dato.

---

## 2. Módulo de Administrador

Todas las acciones de este módulo se realizan desde el panel `/admin`, en la sección **Directores** del menú lateral.

### 2.1 Gestionar Directores de Carrera

1. En el menú lateral del panel de Administrador, haga clic en **Directores**.
2. Se abre la vista de asignación de directores, organizada por carrera (ver [Anexo 1](#5-anexos-y-evidencias)).
3. Haga clic en el botón **Gestionar Directores** (parte superior del panel).
4. Se abre el modal **"Gestionar Directores"**, con el listado de todos los directores existentes.
5. Para crear uno nuevo, haga clic en **Nuevo Director**.
6. Complete el formulario:

   | Campo | Descripción |
   | :--- | :--- |
   | Nombre | Nombre del director |
   | Apellido | Apellido del director |
   | Correo | Correo institucional único |

7. Al confirmar, el sistema:
   - Crea la cuenta con el rol `director`.
   - Muestra un **panel de credenciales** con el correo y una **contraseña temporal fija** que el sistema asigna automáticamente a todo director nuevo.
   - Marca la cuenta con `requiere_cambio_password = true`, de modo que el director esté obligado a definir su propia contraseña en su primer ingreso.

   📸 *Ver Anexo 3 — panel de credenciales tras crear el director.*

   > 📝 **Nota:** copie y entregue estas credenciales al director de forma segura antes de cerrar el panel — el sistema no las vuelve a mostrar después.

8. Cierre el modal. El nuevo director aparece en el listado de **Gestionar Directores** y queda disponible para ser asignado a una o más carreras (siguiente sección).

### 2.2 Asignar un Director a una o varias Carreras

1. En la vista **Directores**, localice la tarjeta de la carrera (por ejemplo *"Ingeniería en Software"*). Si aún no tiene director, la tarjeta muestra el estado **Vacante**.
2. Haga clic en **Asignar Director** dentro de esa tarjeta.
3. En el panel lateral **"Asignar Director"**, busque al director por nombre o correo y selecciónelo.
4. Presione **Confirmar Asignación**.
5. La tarjeta de la carrera se actualiza mostrando el nombre del director asignado.

**Asignación a una segunda carrera (multi-carrera):**

6. Repita los pasos 1-4 sobre **otra** tarjeta de carrera, seleccionando **el mismo director** que ya tiene una carrera asignada.
7. El sistema lo permite sin restricciones y muestra en la tarjeta un indicador **"También dirige: [nombre de la otra carrera]"** — dejando visualmente claro, en ambas tarjetas, que se trata de un director con múltiples carreras a cargo.

   📸 *Ver Anexos 5-7 — asignación a la Carrera A, aviso de "también dirige", y ambas carreras mostrando al mismo director.*

> ✅ **Resultado esperado:** un director puede tener 1, 2 o más carreras asignadas simultáneamente. Cada asignación es independiente — asignarlo a una carrera nueva **no** retira sus carreras anteriores.

### 2.3 Desvincular a un Director de una Carrera

Esta acción retira al director de **una sola carrera**, sin tocar sus otras asignaciones ni eliminar su cuenta.

1. En la tarjeta de la carrera de la que desea desvincularlo, haga clic sobre el director asignado (área clicable de la tarjeta).
2. Seleccione **Desvincular de esta carrera**.
3. El sistema pide confirmación indicando explícitamente que el director **conserva sus otras carreras, si tiene**.
4. Al confirmar, esa carrera vuelve al estado **Vacante**.

   📸 *Ver Anexo 11 — Carrera B desvinculada mientras la Carrera A permanece intacta con el mismo director.*

> ✅ **Verificado:** al desvincular de la Carrera B, la Carrera A sigue mostrando al director sin ningún cambio. Ninguna otra asignación se ve afectada.

### 2.4 Eliminar la cuenta de un Director

Esta acción elimina la cuenta por completo (a diferencia de "desvincular", que solo retira una carrera).

1. Abra **Gestionar Directores**.
2. Localice al director en el listado (puede usar el buscador).
3. Haga clic en el ícono **Eliminar** de su fila.
4. Confirme la eliminación en el diálogo del navegador.
5. El director desaparece del listado; si el listado queda vacío, se muestra el mensaje **"No se encontraron directores"**.
6. Cierre el modal. Las carreras que dirigía vuelven al estado **Vacante**, y su nombre/correo ya no aparece en ninguna tarjeta.

   📸 *Ver Anexos 12-14 — localización previa a eliminar, listado vacío tras eliminar, y carreras liberadas.*

> ⚠️ **Importante:** eliminar la cuenta de un director lo desvincula de **todas** sus carreras a la vez. Si solo desea que deje de dirigir una carrera puntual, use **Desvincular** (sección 2.3) en lugar de eliminar la cuenta.

### 2.5 Definir fechas límite de planificación por carrera

La fecha límite para que cada carrera suba su planificación **no es una configuración única y global** — se define **por carrera**, desde el panel de "Planificación Colaborativa".

1. En el menú lateral, vaya a **Planificación Colaborativa**.
2. En el bloque **"Crear/actualizar flujo"**, seleccione la carrera en el desplegable **"Seleccionar carrera..."**.
3. Elija la **Fecha límite** (fecha y hora).
4. Presione **Crear**.
5. El flujo queda registrado para esa carrera con su fecha límite específica.

   📸 *Ver Anexos 16-18 — panel de gestión de flujos, formulario completado y flujo creado.*

> 📝 **Nota sobre "Flujos existentes":** esta lista solo muestra las carreras cuya fecha límite **ya venció** y que aún no han confirmado su planificación (es el mecanismo de "carreras atrasadas" para seguimiento). Un flujo con fecha límite futura **no aparecerá ahí todavía** — eso es el comportamiento esperado, no un error: la lista es un radar de atrasos, no un listado general de flujos creados.

### 2.6 Verificar el estado de las distribuciones

Desde el panel de Administrador puede confirmar que la planificación de cada carrera se procesó correctamente:

1. Vaya a **Planificación Colaborativa** (o al widget correspondiente en el panel principal).
2. Revise, por carrera, indicadores como clases totales, clases asignadas, conflictos y sobrecupos.
3. Las carreras con conflictos pendientes se distinguen visualmente para que el Administrador pueda dar seguimiento antes de ejecutar la distribución maestra.

---

## 3. Módulo de Director de Carrera

### 3.1 Ver las carreras asignadas

1. Inicie sesión con su correo y contraseña (o complete el cambio de contraseña obligatorio si es su primer ingreso — ver [Sección 1.3](#13-cómo-ingresar)).
2. Es redirigido a su panel `/director`.
3. Si tiene **más de una carrera asignada**, en la pestaña "Inicio" aparece un selector superior **"Carrera Visualizada:"** que le permite elegir cuál carrera consultar en las estadísticas y paneles de conflictos del panel principal.
4. Este selector afecta únicamente **qué datos se muestran en pantalla** — no afecta la subida de planificaciones, que se maneja de forma independiente (siguiente sección).

### 3.2 Subir la planificación — un recuadro independiente por carrera

Este es el punto central del flujo multi-carrera: **cada carrera asignada tiene su propio recuadro de carga**, totalmente independiente de los demás.

1. En el panel de Director, ubique el widget **"Centro de Datos"**.
2. Dentro de él aparece **una tarjeta "Subir Planificación" por cada carrera asignada**, cada una identificada con el nombre de su carrera. Si tiene 2 carreras, verá 2 recuadros; si tiene 3, verá 3, y así sucesivamente.

   📸 *Ver Anexo 9 — dos recuadros independientes, ambos vacíos, uno por carrera.*

3. En **cada** recuadro:
   - Haga clic en la zona **"Seleccionar Excel"** para elegir el archivo (solo se aceptan `.xlsx` y `.xls`, máximo 10 MB).
   - El nombre del archivo elegido se muestra dentro de ese mismo recuadro.
   - Presione el botón **"Procesar [nombre de la carrera]"** — el botón muestra el nombre de la carrera exacta a la que pertenece ese recuadro, para que nunca haya duda de a cuál carrera corresponde.

4. **Puede cargar un archivo distinto en cada recuadro sin que se sobrescriban entre sí.** Cada tarjeta mantiene su propio archivo seleccionado de forma aislada: elegir un Excel en el recuadro de la Carrera A no afecta ni reemplaza el archivo ya elegido en el recuadro de la Carrera B.

   📸 *Ver Anexo 10 — ambos recuadros con archivos distintos seleccionados simultáneamente, cada uno mostrando su propio nombre de archivo sin interferencia.*

> ✅ **Verificado automáticamente:** esta independencia entre recuadros fue comprobada de forma explícita — se seleccionaron dos archivos diferentes en los dos recuadros de un mismo director con dos carreras, y se confirmó que cada recuadro conservó únicamente el archivo correspondiente a su propia carrera.

### 3.3 Interpretar el Reporte de Salud de Datos

Al presionar **"Procesar [carrera]"**, si el Excel se procesa correctamente el sistema puede abrir automáticamente el modal **"Reporte de Salud de Datos"**, que resume la calidad de la información cargada:

| Indicador | Significado |
| :--- | :--- |
| **Total Procesado** | Número total de clases leídas del Excel. |
| **Sin Horario** (rojo si > 0) | Clases que no tienen un horario asignado en el archivo. |
| **Sin Estudiantes** (ámbar si > 0) | Clases sin estudiantes matriculados detectados. |
| **Sin Docente** (gris si > 0) | Clases sin un docente asignado. |

- Cada indicador con valor mayor a 0 es **desplegable**: haga clic sobre él para ver el detalle de qué materias (con ciclo y paralelo) presentan el problema, con un botón **"Editar"** para corregirlas directamente.
- El sistema muestra una **Recomendación** en texto libre según el estado general de los datos.
- Si el estado general no es "bueno", además del botón **"Entendido"** aparece la opción **"Corregir Excel"** para volver a intentar la carga.

> 💡 **Consejo:** revise este reporte cada vez que suba una planificación, incluso si no ve errores obvios — le permite detectar materias sin horario o sin docente antes de que el Administrador ejecute la distribución maestra, evitando retrabajos posteriores.

Si el archivo no genera un reporte de salud detallado, el sistema simplemente confirma con el mensaje **"Planificación subida exitosamente"**.

### 3.4 Interpretar las alertas del panel principal

Además del reporte al momento de subir, el panel principal del Director (pestaña "Inicio") mantiene paneles de alerta permanentes, recalculados cada vez que se actualizan los datos:

- **Conflictos de Horario** (panel rojo): aparece cuando dos o más clases de la carrera visualizada comparten la misma aula en un horario solapado. El mensaje indica cuántas clases están en conflicto y recomienda reasignar una de ellas.
- **Alertas de Sobrecupo** (panel ámbar): aparece cuando el número de estudiantes matriculados en una clase supera la capacidad del aula asignada.

Estos paneles se filtran automáticamente según la **carrera visualizada** seleccionada en la sección 3.1 — si tiene varias carreras, revíselas una por una cambiando el selector para no pasar por alto conflictos de una carrera que no está viendo en ese momento.

---

## 4. Preguntas frecuentes de este módulo

**P: Si desvinculo a un director de una carrera, ¿pierde acceso a sus otras carreras?**
R: No. Desvincular afecta únicamente a la carrera seleccionada. Sus demás asignaciones permanecen intactas (verificado en la sección 2.3).

**P: ¿Puedo definir una sola fecha límite para todas las carreras a la vez?**
R: No existe una pantalla de "fecha límite global" conectada en la interfaz actual. Cada fecha límite se define individualmente, por carrera, desde **Planificación Colaborativa** (sección 2.5).

**P: Subí el Excel equivocado en el recuadro de otra carrera por error, ¿se mezcla con los datos de la carrera correcta?**
R: No. Cada recuadro procesa exclusivamente el archivo que usted seleccionó en **ese** recuadro específico, y el botón de envío muestra el nombre de la carrera para que confirme visualmente antes de presionarlo. Aun así, revise siempre el nombre de la carrera en el encabezado de la tarjeta antes de elegir el archivo.

**P: Un director recién creado no puede iniciar sesión con la contraseña que le di.**
R: Confirme que está usando exactamente la contraseña temporal mostrada en el panel de credenciales al momento de crear la cuenta (sección 2.1). En su primer ingreso, el sistema lo llevará automáticamente a una pantalla para definir su contraseña definitiva — después de ese cambio, la contraseña temporal deja de funcionar.

**P: ¿Por qué no veo la carrera de un director en "Flujos existentes" si ya le definí una fecha límite?**
R: Esa lista solo muestra carreras cuya fecha límite ya pasó sin confirmar. Es el comportamiento esperado (ver nota en sección 2.5), no un error del sistema.

---

## 5. Anexos y Evidencias

Todas las capturas listadas a continuación fueron generadas **automáticamente** por la suite de pruebas end-to-end (Playwright) al ejecutar, contra el sistema real, exactamente los pasos descritos en este manual. No son mockups ni ilustraciones — son evidencia funcional de que cada flujo documentado ocurre tal como se describe.

**Ubicación en el repositorio:** `frontend/e2e/screenshots/`

### 5.1 Ciclo de vida Admin ↔ Director (`admin-director-lifecycle/`)

| # | Archivo | Contenido |
| :-: | :--- | :--- |
| 1 | `01-panel-admin-inicio.png` | Panel de Administración recién iniciada la sesión. |
| 2 | `02-dos-carreras-vacantes-creadas.png` | Dos carreras nuevas creadas, ambas en estado "Vacante". |
| 3 | `03-director-creado-panel-credenciales.png` | Panel de credenciales tras crear un Director nuevo. |
| 4 | `04-director-listado-en-gestion-directores.png` | El director aparece en el listado de "Gestionar Directores". |
| 5 | `05-carrera-a-director-asignado.png` | Director asignado a la Carrera A. |
| 6 | `06-aviso-director-ya-dirige-otra-carrera.png` | Aviso "También dirige..." al asignarlo a una segunda carrera. |
| 7 | `07-director-dirige-ambas-carreras.png` | Ambas carreras mostrando al mismo director simultáneamente. |
| 8 | `08-director-dashboard-tras-primer-login.png` | Panel del Director tras completar el cambio de contraseña obligatorio. |
| 9 | `09-recuadros-independientes-vacios.png` | Dos recuadros de carga independientes, uno por carrera, ambos vacíos. |
| 10 | `10-recuadros-independientes-con-archivos-distintos.png` | Ambos recuadros con archivos Excel **distintos** cargados sin interferencia entre sí. |
| 11 | `11-carrera-b-desvinculada-carrera-a-intacta.png` | Carrera B desvinculada; Carrera A permanece con el director intacto. |
| 12 | `12-director-localizado-para-eliminar.png` | Director localizado en el listado, previo a eliminar su cuenta. |
| 13 | `13-director-eliminado-listado-vacio.png` | Listado de directores vacío tras eliminar la cuenta. |
| 14 | `14-carreras-de-prueba-eliminadas.png` | Limpieza final — carreras de prueba eliminadas. |

### 5.2 Fechas límite de planificación por carrera (`admin-planificacion-periodos/`)

| # | Archivo | Contenido |
| :-: | :--- | :--- |
| 1 | `01-carrera-de-prueba-creada.png` | Carrera de prueba creada para el flujo de planificación. |
| 2 | `02-panel-gestionar-flujos-planificacion.png` | Panel "Planificación Colaborativa" — gestión de flujos. |
| 3 | `03-formulario-fecha-limite-completado.png` | Formulario de fecha límite completado para la carrera. |
| 4 | `04-flujo-creado-con-fecha-limite.png` | Flujo de planificación creado con su fecha límite asignada. |

> 💡 **Cómo regenerar esta evidencia:** ejecute `npx playwright test e2e/admin-director-lifecycle.spec.ts e2e/admin-planificacion-periodos.spec.ts` desde `frontend/`. Las capturas se sobrescriben automáticamente en cada ejecución, quedando siempre sincronizadas con el comportamiento real y vigente del sistema.

---

© 2026 Universidad Internacional del Ecuador — SIGEA-UIDE. Documento generado y verificado mediante pruebas automatizadas.
