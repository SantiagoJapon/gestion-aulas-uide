import { test, expect, Page, Locator } from '@playwright/test';
import {
  loginAsAdmin,
  submitEmailLogin,
  completeForcedPasswordChange,
  logout,
  DIRECTOR_TEMP_PASSWORD,
} from './helpers/auth';
import { createScreenshotter } from './helpers/screenshots';

/**
 * Ciclo de vida completo de un Director con múltiples carreras, visto desde
 * el panel de Administrador y verificado desde el panel del propio Director.
 *
 * Cubre:
 *  1. Alta de dos carreras nuevas (para tener "vacantes" limpias que probar).
 *  2. Creación de un Director (cuenta de acceso generada automáticamente).
 *  3-4. Asignación del MISMO director a las dos carreras (multi-carrera).
 *  5. Verificación, ya como Director, de que el "Centro de Datos" muestra un
 *     recuadro de "Subir Planificación" INDEPENDIENTE por cada carrera, y de
 *     que seleccionar un archivo en un recuadro no afecta al otro.
 *  6. Desvinculación de UNA sola carrera (la otra debe permanecer intacta).
 *  7. Eliminación completa de la cuenta del Director.
 *  8. Limpieza de las carreras de prueba creadas.
 *
 * Se ejecuta en modo `serial`: cada fase depende de que la anterior haya
 * dejado los datos en el estado esperado (mismo patrón que un flujo real de
 * administración). Si una fase falla, Playwright salta las siguientes en
 * vez de acumular fallos en cascada.
 *
 * Alcance deliberado: NO se hace click en "Procesar" al subir el Excel de
 * planificación — eso dispara el pipeline real de parsing/validación
 * académica (columnas, docentes, materias, choques de horario), que
 * requiere un archivo con datos institucionales válidos y pertenece al
 * alcance de otra suite. Aquí se verifica la independencia de la UI de
 * carga (selección de archivo) entre recuadros, que es la regla de negocio
 * pedida ("la subida no debe sobrescribirse entre carreras").
 */

test.describe.serial('Admin: ciclo de vida de un Director multi-carrera', () => {
  // Viewport de escritorio fijo: varios botones del panel admin ocultan su
  // etiqueta de texto (`hidden sm:inline`) por debajo del breakpoint `sm`
  // de Tailwind (~640px). Sin esto, el proyecto "Mobile Chrome" del
  // playwright.config.ts rompería los locators por nombre accesible.
  test.use({ viewport: { width: 1440, height: 900 } });

  const shot = createScreenshotter('admin-director-lifecycle');

  const suffix = Date.now().toString().slice(-6);
  const carreraA = `E2E-A-${suffix}`;
  const carreraB = `E2E-B-${suffix}`;
  const directorNombre = 'E2E';
  const directorApellido = `Dir${suffix}`;
  const directorEmail = `qa.director.${suffix}@uide.edu.ec`;
  const directorNewPassword = 'QaDirector#2026!';

  /** Tarjeta de una carrera en el grid de "Gestión de Liderazgo Académico". */
  function carreraCard(page: Page, nombreCarrera: string): Locator {
    return page
      .getByText(nombreCarrera, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"relative flex flex-col")][1]');
  }

  test.beforeEach(async ({ page }) => {
    // confirm()/alert() nativos se usan en varias acciones destructivas
    // (eliminar carrera, desvincular director, eliminar director).
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('1. Admin crea dos carreras nuevas (vacantes)', async ({ page }) => {
    await loginAsAdmin(page);
    await shot(page, 'panel-admin-inicio');

    for (const nombre of [carreraA, carreraB]) {
      await page.getByRole('button', { name: 'Nueva Carrera' }).click();
      await expect(page.getByRole('heading', { name: 'Nueva Carrera' })).toBeVisible();
      await page.getByPlaceholder('Ej: Ingeniería en Sistemas').fill(nombre);
      await page.getByRole('button', { name: 'Crear Carrera' }).click();
      await expect(carreraCard(page, nombre)).toBeVisible({ timeout: 10000 });
    }

    // Ambas deben figurar como "Vacante" recién creadas
    await expect(carreraCard(page, carreraA).getByText('Vacante')).toBeVisible();
    await expect(carreraCard(page, carreraB).getByText('Vacante')).toBeVisible();
    await shot(page, 'dos-carreras-vacantes-creadas');
  });

  test('2. Admin crea un Director y recibe sus credenciales de acceso', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Directores' }).click();
    await expect(page.getByRole('heading', { name: 'Gestionar Directores' })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo Director' }).click();
    // exact:true — sin esto, "Nuevo Director" también hace match por
    // substring contra el subtítulo del formulario "Registrar nuevo director".
    await expect(page.getByRole('heading', { name: 'Nuevo Director', exact: true })).toBeVisible();

    await page.getByPlaceholder('Ej: Juan').fill(directorNombre);
    await page.getByPlaceholder('Ej: Pérez').fill(directorApellido);
    await page.getByPlaceholder('correo@institucional.edu.ec').fill(directorEmail);

    await page.getByRole('button', { name: 'Crear Director y Generar Acceso' }).click();

    // Panel de credenciales generadas
    await expect(page.getByText('¡Director registrado!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(directorEmail, { exact: true })).toBeVisible();
    // La contraseña temporal mostrada debe coincidir con la que el backend
    // asigna siempre a un director nuevo (usuarioController.js).
    await expect(page.getByText(DIRECTOR_TEMP_PASSWORD, { exact: true })).toBeVisible();
    await shot(page, 'director-creado-panel-credenciales');

    await page.getByRole('button', { name: 'Cerrar' }).click();
    // Sin exact:true: en la fila de la lista, el ícono "mail" y el email
    // comparten el mismo <span> (mismo nodo de texto), así que el texto
    // completo del elemento nunca es exactamente igual al email solo.
    await expect(page.getByText(directorEmail)).toBeVisible();
    await shot(page, 'director-listado-en-gestion-directores');

    // Cerrar el modal "Gestionar Directores" para dejar la pantalla lista
    // para la fase de asignación de carreras.
    const modalHeader = page
      .getByRole('heading', { name: 'Gestionar Directores' })
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await modalHeader.locator('button:has(span.material-symbols-outlined:text-is("close"))').click();
  });

  test('3. Admin asigna el Director a la Carrera A', async ({ page }) => {
    await loginAsAdmin(page);

    await carreraCard(page, carreraA).getByRole('button', { name: 'Asignar Director' }).click();
    await expect(page.getByRole('heading', { name: 'Asignar Director' })).toBeVisible();

    await page.getByPlaceholder('Buscar por nombre o correo...').fill(directorEmail);
    await page.getByText(`${directorNombre} ${directorApellido}`, { exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar Asignación' }).click();

    // La tarjeta deja de estar "Vacante" y muestra al director asignado
    await expect(carreraCard(page, carreraA).getByText('Vacante')).toHaveCount(0);
    await expect(carreraCard(page, carreraA).getByText(directorEmail)).toBeVisible();
    await shot(page, 'carrera-a-director-asignado');
  });

  test('4. Admin asigna el MISMO Director a la Carrera B (multi-carrera)', async ({ page }) => {
    await loginAsAdmin(page);

    await carreraCard(page, carreraB).getByRole('button', { name: 'Asignar Director' }).click();
    await expect(page.getByRole('heading', { name: 'Asignar Director' })).toBeVisible();

    await page.getByPlaceholder('Buscar por nombre o correo...').fill(directorEmail);

    // Regla de negocio a verificar: como este director YA dirige la
    // Carrera A, el panel de selección debe advertirlo explícitamente
    // antes de confirmar la segunda asignación.
    await expect(page.getByText(new RegExp(`También dirige:.*${carreraA}`))).toBeVisible();
    await shot(page, 'aviso-director-ya-dirige-otra-carrera');

    await page.getByText(`${directorNombre} ${directorApellido}`, { exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar Asignación' }).click();

    await expect(carreraCard(page, carreraB).getByText(directorEmail)).toBeVisible();
    // Evidencia visual del multi-carrera: ambas tarjetas muestran al mismo director
    await expect(carreraCard(page, carreraA).getByText(directorEmail)).toBeVisible();
    await shot(page, 'director-dirige-ambas-carreras');
  });

  test('5. Director inicia sesión y ve recuadros de carga independientes por carrera', async ({ page }) => {
    await submitEmailLogin(page, directorEmail, DIRECTOR_TEMP_PASSWORD);
    await completeForcedPasswordChange(page, directorNewPassword);
    await shot(page, 'director-dashboard-tras-primer-login');

    const centroDatos = page.locator('#tour-centro-datos');
    await expect(centroDatos.getByRole('heading', { name: 'Centro de Datos' })).toBeVisible();

    // Los nombres de carrera de cada tarjeta usan esta combinación exacta de
    // clases en SubirPlanificacionCard.tsx — nos permite ubicar cada
    // recuadro sin ambigüedad frente a otros textos (selector "Carrera
    // Visualizada", "Perfil del Director", etc.) que también muestran el
    // nombre de la carrera en otra parte de la página.
    const cardTitleA = centroDatos.locator('p.text-xs.font-black.text-slate-800', { hasText: carreraA });
    const cardTitleB = centroDatos.locator('p.text-xs.font-black.text-slate-800', { hasText: carreraB });
    await expect(cardTitleA).toBeVisible();
    await expect(cardTitleB).toBeVisible();

    const cardBodyA = cardTitleA.locator('xpath=..');
    const cardBodyB = cardTitleB.locator('xpath=..');

    // Nota: un <input type="file"> también expone el rol accesible
    // "button" (AOM), así que getByRole('button') a secas aquí sería
    // ambiguo entre el input de archivo y el botón "Procesar" real.
    const submitButton = (card: typeof cardBodyA) => card.getByRole('button', { name: /^Procesar/ });

    // Estado inicial: ambos recuadros sin archivo seleccionado, botón deshabilitado
    await expect(cardBodyA.getByText('Seleccionar Excel')).toBeVisible();
    await expect(cardBodyB.getByText('Seleccionar Excel')).toBeVisible();
    await expect(submitButton(cardBodyA)).toBeDisabled();
    await expect(submitButton(cardBodyB)).toBeDisabled();
    await shot(page, 'recuadros-independientes-vacios');

    // Seleccionamos un archivo DISTINTO en cada recuadro (no se necesita un
    // .xlsx real: aquí solo se verifica el estado de selección en la UI,
    // no el pipeline de parsing del backend).
    const fileA = {
      name: `planificacion-${carreraA}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('contenido-de-prueba-e2e-carrera-a'),
    };
    const fileB = {
      name: `planificacion-${carreraB}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('contenido-de-prueba-e2e-carrera-b'),
    };

    await cardBodyA.locator('input[type="file"]').setInputFiles(fileA);
    await expect(cardBodyA.getByText(fileA.name)).toBeVisible();
    // El recuadro de la Carrera B NO debe verse afectado por la selección en A
    await expect(cardBodyB.getByText('Seleccionar Excel')).toBeVisible();
    await expect(cardBodyB.getByText(fileA.name)).toHaveCount(0);

    await cardBodyB.locator('input[type="file"]').setInputFiles(fileB);
    await expect(cardBodyB.getByText(fileB.name)).toBeVisible();

    // Verificación cruzada final: cada recuadro conserva SU PROPIO archivo,
    // ninguno fue sobrescrito por la selección del otro.
    await expect(cardBodyA.getByText(fileA.name)).toBeVisible();
    await expect(cardBodyA.getByText(fileB.name)).toHaveCount(0);
    await expect(cardBodyB.getByText(fileB.name)).toBeVisible();
    await expect(cardBodyB.getByText(fileA.name)).toHaveCount(0);

    await expect(submitButton(cardBodyA)).toBeEnabled();
    await expect(submitButton(cardBodyB)).toBeEnabled();
    await shot(page, 'recuadros-independientes-con-archivos-distintos');

    await logout(page);
  });

  test('6. Admin desvincula al Director de la Carrera B sin afectar la Carrera A', async ({ page }) => {
    await loginAsAdmin(page);

    await carreraCard(page, carreraB).locator('.cursor-pointer').click();
    await expect(page.getByRole('heading', { name: 'Asignar Director' })).toBeVisible();

    await page.getByRole('button', { name: 'Desvincular de esta carrera' }).click();

    // La Carrera B vuelve a estar vacante...
    await expect(carreraCard(page, carreraB).getByText('Vacante')).toBeVisible({ timeout: 10000 });
    // ...pero la Carrera A conserva al director sin cambios.
    await expect(carreraCard(page, carreraA).getByText(directorEmail)).toBeVisible();
    await shot(page, 'carrera-b-desvinculada-carrera-a-intacta');
  });

  test('7. Admin elimina la cuenta del Director', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Directores' }).click();
    await expect(page.getByRole('heading', { name: 'Gestionar Directores' })).toBeVisible();

    await page.getByPlaceholder('Buscar por nombre o email...').fill(directorEmail);
    // Sin exact:true: el ícono "mail" y el email comparten <span> en esta fila.
    const directorRow = page
      .getByText(directorEmail)
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await expect(directorRow).toBeVisible();
    await shot(page, 'director-localizado-para-eliminar');

    await directorRow.locator('button:has(span.material-symbols-outlined:text-is("delete"))').click();
    // La búsqueda sigue filtrada por este email único, así que el estado
    // vacío del listado ("No se encontraron directores") es prueba
    // suficiente de que ya no existe NINGUNA fila para este director.
    // (No usamos page.getByText(directorEmail).toHaveCount(0) aquí: la
    // tarjeta de la Carrera A, detrás del modal, todavía no se refresca —
    // eso se verifica más abajo, después de cerrar el modal.)
    await expect(page.getByText('No se encontraron directores')).toBeVisible({ timeout: 10000 });
    await shot(page, 'director-eliminado-listado-vacio');

    const modalHeader = page
      .getByRole('heading', { name: 'Gestionar Directores' })
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await modalHeader.locator('button:has(span.material-symbols-outlined:text-is("close"))').click();

    // Al cerrar el modal, DirectorAssignmentView vuelve a cargar sus datos:
    // la Carrera A debe reflejar ahora que quedó vacante (su único director
    // fue eliminado). Esta es la verificación real de "no queda residuo".
    await expect(carreraCard(page, carreraA).getByText('Vacante')).toBeVisible({ timeout: 10000 });
    await expect(carreraCard(page, carreraA).getByText(directorEmail)).toHaveCount(0);
  });

  test('8. Limpieza — Admin elimina las carreras de prueba creadas', async ({ page }) => {
    await loginAsAdmin(page);

    for (const nombre of [carreraA, carreraB]) {
      const card = carreraCard(page, nombre);
      await card.locator('button:has(span.material-symbols-outlined:text-is("more_vert"))').click();
      await page.getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.getByText(nombre, { exact: true })).toHaveCount(0, { timeout: 10000 });
    }
    await shot(page, 'carreras-de-prueba-eliminadas');
  });
});
