import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { createScreenshotter } from './helpers/screenshots';

/**
 * Configuración de "períodos" de planificación por carrera.
 *
 * NOTA IMPORTANTE (léase antes de modificar este archivo): el backend
 * expone un endpoint de "configuración global" en
 * backend/src/controllers/configuracionPlanificacionController.js
 * (montado en /configuracion-planificacion), pero a día de hoy NO tiene
 * ninguna pantalla en el frontend que lo consuma (no aparece en
 * frontend/src/services/api.ts ni en ningún componente). La función
 * REALMENTE disponible en la UI para definir "hasta cuándo puede una
 * carrera enviar su planificación" es el panel "Gestionar flujos de
 * planificación" (GestionarFlujosPanel.tsx), dentro de la pestaña
 * "Planificación Colaborativa" del Administrador — que define una fecha
 * límite POR CARRERA (no una única fecha global para todo el sistema).
 *
 * Esta suite prueba esa funcionalidad real. Si en el futuro se conecta una
 * pantalla de configuración verdaderamente global, esta suite debe
 * actualizarse (o ampliarse) para cubrirla también.
 */

test.describe.serial('Admin: fechas límite de planificación por carrera', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const shot = createScreenshotter('admin-planificacion-periodos');
  const suffix = Date.now().toString().slice(-6);
  const carrera = `E2E-P-${suffix}`;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('1. Admin crea una carrera de prueba', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Nueva Carrera' }).click();
    await page.getByPlaceholder('Ej: Ingeniería en Sistemas').fill(carrera);
    await page.getByRole('button', { name: 'Crear Carrera' }).click();

    await expect(page.getByText(carrera, { exact: true })).toBeVisible({ timeout: 10000 });
    await shot(page, 'carrera-de-prueba-creada');
  });

  test('2. Admin define la fecha límite de planificación para la carrera', async ({ page }) => {
    await loginAsAdmin(page);

    await page.locator('#tour-nav-planificacion_colaborativa').click();

    // .mac-card es el contenedor raíz de cada DashboardWidget — nos permite
    // aislar ESTE panel de los otros tres que comparten la misma pestaña
    // (CarrerasPendientesPanel, CompletarHuecosPanel, BloquesConfirmadosPanel).
    const flujosPanel = page.locator('.mac-card').filter({
      has: page.getByRole('heading', { name: 'Gestionar flujos de planificación' }),
    });
    await expect(flujosPanel).toBeVisible();
    await shot(page, 'panel-gestionar-flujos-planificacion');

    await flujosPanel.locator('select').selectOption({ label: carrera });

    // IMPORTANTE (verificado contra backend/src/services/planificacionCarrera.service.js):
    // la lista "Flujos existentes" de este panel NO lista todos los flujos —
    // se alimenta de detectarCarrerasSinEnviar(), que solo devuelve flujos
    // VENCIDOS (estado != CONFIRMADA y fecha_limite < ahora). Un flujo con
    // fecha límite futura queda registrado igualmente en la base de datos,
    // pero esta lista concreta no lo muestra (la carrera seguiría figurando
    // bajo "Sin flujo creado", aunque sí tiene uno — quirk real de la UI).
    // Por eso usamos una fecha límite en el PASADO: es la única forma de
    // verificar visualmente, en esta pantalla, que el flujo quedó creado.
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaLimite = ayer.toISOString().slice(0, 16);
    await flujosPanel.locator('input[type="datetime-local"]').fill(fechaLimite);
    await shot(page, 'formulario-fecha-limite-completado');

    await flujosPanel.getByRole('button', { name: 'Crear' }).click();

    await expect(flujosPanel.getByText('Flujo de planificación creado/actualizado.')).toBeVisible({
      timeout: 10000,
    });

    // El flujo recién creado (ya vencido) debe listarse con su fecha límite
    // y en estado "Borrador". Se usa la clase del <p> de la fila de la
    // lista (no getByText a secas) porque el nombre de la carrera también
    // existe, oculto, dentro de la <option> del <select> de más arriba.
    await expect(flujosPanel.locator('p.text-xs.font-black.text-foreground', { hasText: carrera })).toBeVisible({
      timeout: 10000,
    });
    await expect(flujosPanel.getByText(/Límite:/)).toBeVisible();
    await expect(flujosPanel.getByText('Borrador')).toBeVisible();
    await shot(page, 'flujo-creado-con-fecha-limite');
  });

  test('3. Limpieza — Admin elimina la carrera de prueba', async ({ page }) => {
    await loginAsAdmin(page);

    const card = page
      .getByText(carrera, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"relative flex flex-col")][1]');
    await card.locator('button:has(span.material-symbols-outlined:text-is("more_vert"))').click();
    await page.getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.getByText(carrera, { exact: true })).toHaveCount(0, { timeout: 10000 });
  });
});
