import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout } from './helpers/auth';

test.describe('Rol: Administrador del Sistema', () => {
  test('inicia sesión y accede al panel de administración', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText('Administración Central')).toBeVisible();
    await expect(page.locator('#tour-nav-general')).toBeVisible();
  });

  test('gestiona el catálogo de aulas (Gestión Aulas)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#tour-nav-espacios').click();

    await expect(page.getByRole('heading', { name: 'Inventario de Aulas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar Aula' })).toBeVisible();

    // El catálogo distingue Aulas Académicas de Espacios Comunes
    await expect(page.getByRole('button', { name: 'Aulas Académicas' })).toBeVisible();
    await page.getByRole('button', { name: 'Espacios Comunes' }).click();
    await expect(page.getByRole('button', { name: 'Espacios Comunes' })).toHaveClass(/bg-white/);
  });

  test('gestiona usuarios: listado y alta de docentes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#tour-nav-docentes').click();

    // exact:true — "Plantilla Docente" también es substring del subtítulo
    // del widget "Plantilla Docente Institucional".
    await expect(page.getByRole('heading', { name: 'Plantilla Docente', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo Docente' })).toBeVisible();
  });

  test('gestiona usuarios: listado de estudiantes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#tour-nav-estudiantes').click();

    await expect(page.getByRole('heading', { name: 'Listado General de Estudiantes' })).toBeVisible();
  });

  test('accede a la configuración general del sistema (Ajustes)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.locator('#tour-nav-settings').click();

    await expect(page.getByRole('heading', { name: 'Información Personal' })).toBeVisible();

    // "Seguridad de la Cuenta" vive en su propia sub-pestaña (UserSettings.tsx
    // renderiza "perfil" por defecto) — hay que abrir "Seguridad" primero.
    await page.getByRole('button', { name: 'Seguridad' }).click();
    await expect(page.getByRole('heading', { name: 'Seguridad de la Cuenta' })).toBeVisible();
  });

  test('cierra sesión correctamente', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
  });
});
