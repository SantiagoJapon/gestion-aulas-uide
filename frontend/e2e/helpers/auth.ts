import { Page, expect } from '@playwright/test';

/**
 * Credenciales de prueba para cada rol.
 *
 * El backend solo garantiza (vía seed.js) la existencia de UNA cuenta admin:
 * admin@uide.edu.ec, con contraseña DEFAULT_ADMIN_PASSWORD o 'uide2024' por
 * defecto. Las cuentas de docente y director se crean dinámicamente cuando
 * un Director sube una planificación en Excel; las de estudiante se crean al
 * importar un listado de estudiantes por cédula. No hay ninguna garantizada
 * en un entorno recién levantado, así que se inyectan por variables de
 * entorno. Las suites que las requieren se saltan (test.skip) si faltan,
 * en vez de fallar con un falso "credenciales incorrectas".
 */
export const CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@uide.edu.ec',
    password: process.env.TEST_ADMIN_PASSWORD || 'uide2024',
  },
  docente: {
    email: process.env.TEST_DOCENTE_EMAIL || '',
    password: process.env.TEST_DOCENTE_PASSWORD || '',
  },
  director: {
    email: process.env.TEST_DIRECTOR_EMAIL || '',
    password: process.env.TEST_DIRECTOR_PASSWORD || '',
  },
  estudiante: {
    // La cédula debe existir previamente en la base de datos (10 dígitos).
    cedula: process.env.TEST_ESTUDIANTE_CEDULA || '',
  },
};

/**
 * Cada dashboard (Estudiante/Docente/Director/Admin) lanza un tour guiado
 * de bienvenida (react-joyride) la primera vez que localStorage no tiene su
 * flag `uide_tour_<rol>_v1`. Como cada test de Playwright arranca con un
 * contexto/almacenamiento en blanco, el tour se dispararía en CADA prueba,
 * y su overlay (`.react-joyride__overlay`) intercepta los clics sobre la
 * página real, produciendo timeouts. Se marca como "ya visto" para los 4
 * roles antes de iniciar sesión — no afecta la funcionalidad probada, solo
 * evita el overlay de bienvenida.
 */
async function disableGuidedTours(page: Page) {
  await page.evaluate(() => {
    for (const rol of ['estudiante', 'profesor', 'director', 'admin']) {
      window.localStorage.setItem(`uide_tour_${rol}_v1`, 'true');
    }
  });
}

/** Login.tsx alterna entre modo "Docente" (email + contraseña) y "Estudiante" (solo cédula). */
export async function submitEmailLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await disableGuidedTours(page);
  // El modo Docente es el default, pero forzamos el toggle por si una
  // prueba anterior en el mismo contexto dejó seleccionado "Estudiante".
  await page.getByRole('button', { name: 'Docente' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
}

export async function loginAsAdmin(page: Page) {
  await submitEmailLogin(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
}

export async function loginAsDocente(page: Page) {
  await submitEmailLogin(page, CREDENTIALS.docente.email, CREDENTIALS.docente.password);
  await expect(page).toHaveURL(/\/profesor$/, { timeout: 15000 });
}

export async function loginAsDirector(page: Page) {
  await submitEmailLogin(page, CREDENTIALS.director.email, CREDENTIALS.director.password);
  await expect(page).toHaveURL(/\/director$/, { timeout: 15000 });
}

export async function loginAsEstudiante(page: Page) {
  await page.goto('/login');
  await disableGuidedTours(page);
  await page.getByRole('button', { name: 'Estudiante' }).click();
  await page.locator('#cedula').fill(CREDENTIALS.estudiante.cedula);
  await page.getByRole('button', { name: 'Acceder como Estudiante' }).click();
  await expect(page).toHaveURL(/\/estudiante$/, { timeout: 15000 });
}

/** El botón de logout en el sidebar no tiene aria-label ni title; solo el ícono "logout". */
export async function logout(page: Page) {
  await page.locator('button:has(span.material-symbols-outlined:text-is("logout"))').first().click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
}

/**
 * Contraseña temporal que el backend asigna SIEMPRE a un director recién
 * creado por el Administrador (usuarioController.js: createUsuario ->
 * passwordFinal = 'uide2026' cuando finalRol === 'director'). No es un
 * valor de prueba inventado: es el valor real que usa el sistema.
 */
export const DIRECTOR_TEMP_PASSWORD = 'uide2026';

/**
 * Un usuario recién creado por el Admin tiene `requiere_cambio_password:
 * true`, así que su primer login SIEMPRE aterriza en /cambiar-password
 * (ForcePasswordChange.tsx) antes de llegar a su dashboard. Este helper
 * completa ese paso obligatorio y deja al usuario ya en su panel de rol.
 */
export async function completeForcedPasswordChange(page: Page, newPassword: string) {
  await expect(page).toHaveURL(/\/cambiar-password$/, { timeout: 15000 });
  await page.getByPlaceholder('Crea una clave fuerte').fill(newPassword);
  await page.getByPlaceholder('Repite la clave').fill(newPassword);
  await page.getByRole('button', { name: 'Finalizar Configuración' }).click();
  // Tras el mensaje de éxito, la app redirige sola a /director (o el rol que corresponda).
  await expect(page).toHaveURL(/\/(director|profesor|admin|estudiante)$/, { timeout: 15000 });
}
