import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// El frontend es un proyecto ESM ("type": "module" en package.json), así
// que __dirname no existe aquí — se deriva desde import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', 'screenshots');

/**
 * Crea un "capturador" numerado para un flujo de prueba. Cada llamada guarda
 * una captura de pantalla de página completa en:
 *   frontend/e2e/screenshots/<subfolder>/NN-etiqueta.png
 *
 * Las capturas quedan numeradas en el orden en que ocurren dentro del test,
 * lo que permite usarlas directamente como evidencia/anexo en el manual de
 * usuario (ver README de screenshots o la sección "Anexos" del manual).
 */
export function createScreenshotter(subfolder: string) {
  let step = 0;
  const dir = path.join(BASE_DIR, subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return async (page: Page, label: string) => {
    step += 1;
    const safeLabel = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quitar tildes
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `${String(step).padStart(2, '0')}-${safeLabel}.png`;
    await page.screenshot({ path: path.join(dir, filename), fullPage: true });
  };
}
