import { test, expect } from '@playwright/test';

test.describe('Login — Pantalla de acceso', () => {
  test('redirige a /login cuando no hay sesión activa', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('carga el formulario con el toggle Docente / Estudiante (modo Docente por defecto)', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Docente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Estudiante' })).toBeVisible();

    // Modo Docente: correo + contraseña
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
  });

  test('alterna a modo Estudiante y muestra el campo de cédula (sin contraseña)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Estudiante' }).click();

    await expect(page.locator('#cedula')).toBeVisible();
    await expect(page.locator('#password')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Acceder como Estudiante' })).toBeVisible();
  });

  test('muestra error con credenciales de docente/admin incorrectas', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Docente' }).click();
    await page.locator('#email').fill('usuario.invalido@uide.edu.ec');
    await page.locator('#password').fill('ClaveIncorrecta123!');
    await page.locator('button[type="submit"]').click();

    // Backend real (verificado con curl): 401 { mensaje: "Credenciales inválidas" }.
    // No incluimos "error" en el patrón: el ícono del banner también es un
    // <span> con ese texto literal, y matchearía dos elementos (modo strict).
    await expect(page.getByText(/incorrecta|inválid|no se pudo conectar/i)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('muestra error con cédula de estudiante no registrada', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Estudiante' }).click();
    await page.locator('#cedula').fill('0000000000');
    await page.getByRole('button', { name: 'Acceder como Estudiante' }).click();

    // Backend real: 404 { mensaje: "Estudiante no encontrado" } (concuerda en
    // masculino con "Estudiante", no con "cédula").
    await expect(page.getByText(/no encontrad[oa]|incorrecta|inválid|no se pudo conectar/i)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });
});
