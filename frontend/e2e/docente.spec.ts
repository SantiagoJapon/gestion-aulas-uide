import { test, expect } from '@playwright/test';
import { loginAsDocente, logout, CREDENTIALS } from './helpers/auth';

test.describe('Rol: Docente', () => {
  test.beforeEach(async () => {
    test.skip(
      !CREDENTIALS.docente.email || !CREDENTIALS.docente.password,
      'Define TEST_DOCENTE_EMAIL y TEST_DOCENTE_PASSWORD para ejecutar las pruebas de Docente.'
    );
  });

  test('inicia sesión y accede al panel docente', async ({ page }) => {
    await loginAsDocente(page);
    await expect(page.locator('#tour-nav-general')).toBeVisible();
    await expect(page.locator('#tour-nav-horario')).toBeVisible();
  });

  test('consulta su horario docente', async ({ page }) => {
    await loginAsDocente(page);
    await page.locator('#tour-nav-horario').click();

    await expect(page.getByRole('heading', { name: 'Mi Horario Académico' })).toBeVisible();
  });

  test('solicita la reserva de un aula regular', async ({ page }) => {
    await loginAsDocente(page);
    await page.locator('#tour-reserva-flotante').click();
    await expect(page.getByRole('heading', { name: 'Reservar espacio' })).toBeVisible();

    // A diferencia del Estudiante, el Docente sí puede solicitar aulas académicas regulares.
    await page.getByRole('button', { name: 'Aula', exact: true }).click();
    await expect(page.getByText('Desde', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: /Ver espacios disponibles/ }).click();

    // Resultado: lista de espacios disponibles o el estado "sin disponibilidad" en ese horario
    await expect(
      page.getByText(/Verificando disponibilidad|Sin disponibilidad|pers\./).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('envía un reporte de incidencia en un aula', async ({ page }) => {
    await loginAsDocente(page);
    await page.locator('#tour-nav-incidencias').click();

    await expect(page.getByRole('heading', { name: 'Reportar Incidencia' })).toBeVisible();
    await page.getByRole('button', { name: 'Reportar Incidencia' }).click();

    // Formulario del modal de incidencia
    const tituloInput = page.getByPlaceholder('Ej: Proyector sin señal HDMI');
    await expect(tituloInput).toBeVisible();
    await tituloInput.fill('Proyector no enciende (prueba E2E)');
    await page.getByPlaceholder('Ej: A-101').fill('A-101');

    await page.getByRole('button', { name: 'Enviar reporte' }).click();

    // El modal se cierra tras un envío exitoso
    await expect(tituloInput).toHaveCount(0, { timeout: 10000 });
  });

  test('cierra sesión correctamente', async ({ page }) => {
    await loginAsDocente(page);
    await logout(page);
  });
});
