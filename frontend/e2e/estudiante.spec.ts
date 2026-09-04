import { test, expect } from '@playwright/test';
import { loginAsEstudiante, logout, CREDENTIALS } from './helpers/auth';

test.describe('Rol: Estudiante', () => {
  test.beforeEach(async () => {
    test.skip(
      !CREDENTIALS.estudiante.cedula,
      'Define TEST_ESTUDIANTE_CEDULA (10 dígitos, existente en la BD) para ejecutar las pruebas de Estudiante.'
    );
  });

  test('inicia sesión con cédula y accede al portal estudiantil', async ({ page }) => {
    await loginAsEstudiante(page);
    await expect(page.locator('#tour-nav-general')).toBeVisible();

    // El portal de estudiante no debe exponer secciones administrativas
    await expect(page.locator('#tour-nav-docentes')).toHaveCount(0);
    await expect(page.locator('#tour-nav-estudiantes')).toHaveCount(0);
    await expect(page.locator('#tour-nav-espacios')).toHaveCount(0);
    await expect(page.locator('#tour-nav-reservas')).toHaveCount(0);
  });

  test('consulta su horario personal de clases', async ({ page }) => {
    await loginAsEstudiante(page);
    await page.locator('#tour-nav-horario').click();

    await expect(page.getByRole('heading', { name: 'Mi Horario Estudiantil' })).toBeVisible();
  });

  test('consulta el mapa/disponibilidad de aulas mediante el widget de reservas', async ({ page }) => {
    await loginAsEstudiante(page);
    await page.locator('#tour-reserva-flotante').click();

    await expect(page.getByRole('heading', { name: 'Reservar espacio' })).toBeVisible();
    // Buscador de espacios por nombre/código
    await expect(page.getByPlaceholder('Buscar aula por nombre o código...')).toBeVisible();
    // Categorías de espacio disponibles para explorar disponibilidad
    await expect(page.getByRole('button', { name: 'Laboratorio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sala de Estudio' })).toBeVisible();
  });

  test('NO puede reservar aulas regulares — solo salas de biblioteca/estudio', async ({ page }) => {
    await loginAsEstudiante(page);
    await page.locator('#tour-reserva-flotante').click();
    await expect(page.getByRole('heading', { name: 'Reservar espacio' })).toBeVisible();

    // Regla de negocio esperada para el rol Estudiante: solo puede solicitar
    // salas de biblioteca/estudio (SALA_ESPECIAL), nunca aulas académicas
    // regulares ni el auditorio institucional.
    await expect(page.getByRole('button', { name: 'Sala de Estudio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aula', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Auditorio' })).not.toBeVisible();
  });

  test('cierra sesión correctamente', async ({ page }) => {
    await loginAsEstudiante(page);
    await logout(page);
  });
});
