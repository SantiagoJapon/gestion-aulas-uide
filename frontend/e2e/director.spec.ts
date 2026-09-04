import { test, expect } from '@playwright/test';
import { loginAsDirector, logout, CREDENTIALS } from './helpers/auth';

test.describe('Rol: Director de Carrera', () => {
  test.beforeEach(async () => {
    test.skip(
      !CREDENTIALS.director.email || !CREDENTIALS.director.password,
      'Define TEST_DIRECTOR_EMAIL y TEST_DIRECTOR_PASSWORD para ejecutar las pruebas de Director.'
    );
  });

  test('inicia sesión y accede al panel de Director', async ({ page }) => {
    await loginAsDirector(page);
    await expect(page.getByText('Panel Directivo')).toBeVisible();
    await expect(page.locator('#tour-nav-reservas')).toBeVisible();
  });

  test('accede al panel de aprobación/rechazo de reservas pendientes', async ({ page }) => {
    await loginAsDirector(page);
    await page.locator('#tour-nav-reservas').click();

    await expect(page.getByRole('heading', { name: 'Gestión de Reservas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pendientes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Activas/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Rechazadas/ })).toBeVisible();

    // "Pendientes" es el filtro activo por defecto al entrar
    await expect(page.getByRole('button', { name: /Pendientes/ })).toHaveClass(/bg-uide-blue/);
  });

  test('aprueba o rechaza una reserva pendiente (si hay alguna en cola)', async ({ page }) => {
    await loginAsDirector(page);
    await page.locator('#tour-nav-reservas').click();
    await expect(page.getByRole('heading', { name: 'Gestión de Reservas' })).toBeVisible();

    const aprobarBtn = page.getByRole('button', { name: 'Aprobar' }).first();
    if (await aprobarBtn.count() > 0) {
      await aprobarBtn.click();
      // La lista se recarga y sigue mostrando el panel de gestión
      await expect(page.getByRole('heading', { name: 'Gestión de Reservas' })).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No había reservas pendientes en cola al momento de correr la prueba.',
      });
    }
  });

  test('visualiza la matriz de distribución inteligente de aulas (mapa de calor detallado)', async ({ page }) => {
    await loginAsDirector(page);
    await page.locator('#tour-nav-heatmap').click();

    // Vistas de la matriz: resumen, tabla detallada (grid de aulas x horario), por franja
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tabla Detallada' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Por Franja' })).toBeVisible();

    await page.getByRole('button', { name: 'Tabla Detallada' }).click();
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('cierra sesión correctamente', async ({ page }) => {
    await loginAsDirector(page);
    await logout(page);
  });
});
