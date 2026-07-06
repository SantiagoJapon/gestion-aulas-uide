#!/usr/bin/env node
// =============================================================================
// validate-env.js — Validador de variables de entorno
// =============================================================================
// Ejecutar al inicio de cada servicio (backend, bot, n8n).
// Verifica que TODAS las variables requeridas existan y no contengan placeholders.
//
// Uso:
//   node scripts/validate-env.js              # Valida todo
//   node scripts/validate-env.js --backend    # Solo backend
//   node scripts/validate-env.js --bot        # Solo bot
//   node scripts/validate-env.js --n8n        # Solo n8n

const MODE = process.argv[2] || '--all';

const VARIABLES = {
  backend: {
    required: [
      'DB_PASSWORD',
      'JWT_SECRET',
      'REDIS_PASSWORD',
      'SMTP_PASS',
      'EVOLUTION_API_KEY',
    ],
    optional: [
      'OPENAI_API_KEY',
      'SMTP_UIDE_PASS',
      'VOICE_API_KEY',
      'ANTHROPIC_API_KEY',
    ],
  },
  bot: {
    required: [
      'BOT_PORT',
      'BOT_EVOLUTION_URL',
      'BOT_EVOLUTION_KEY',
      'BOT_BACKEND_URL',
    ],
    optional: [],
  },
  n8n: {
    required: [
      'N8N_PASSWORD',
      'DB_PASSWORD',
    ],
    optional: [
      'OPENAI_API_KEY',
      'EVOLUTION_API_KEY',
    ],
  },
};

const PLACEHOLDER_PATTERNS = [
  'CAMBIAR',
  'GENERAR',
  'tu_correo',
  'tu_contraseña',
  'tu-correo',
  'tu-contraseña',
  'REEMPLAZAR',
  'REQUERIDO',
];

function isPlaceholder(value) {
  if (!value) return false;
  const upper = value.toUpperCase();
  return PLACEHOLDER_PATTERNS.some(p => upper.includes(p));
}

function validate(service) {
  const config = VARIABLES[service];
  if (!config) return [];

  const errors = [];
  const warnings = [];

  for (const key of config.required) {
    const value = process.env[key];
    if (!value) {
      errors.push(`❌ FALTA: ${key} (requerida)`);
    } else if (isPlaceholder(value)) {
      errors.push(`❌ PLACEHOLDER: ${key} = "${value}" (debe cambiarse en prod)`);
    }
  }

  for (const key of config.optional) {
    const value = process.env[key];
    if (!value) {
      warnings.push(`⚠️  Opcional no definida: ${key}`);
    } else if (isPlaceholder(value)) {
      warnings.push(`⚠️  Opcional con placeholder: ${key} = "${value}"`);
    }
  }

  return { errors, warnings };
}

function main() {
  console.log('🔍 Validando variables de entorno...\n');

  const services = MODE === '--all'
    ? ['backend', 'bot', 'n8n']
    : [MODE.replace('--', '')];

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const service of services) {
    const { errors, warnings } = validate(service);

    if (errors.length > 0 || warnings.length > 0) {
      console.log(`📦 ${service.toUpperCase()}:`);
      errors.forEach(e => console.log(`   ${e}`));
      warnings.forEach(w => console.log(`   ${w}`));
      console.log('');
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('✅ Todas las variables de entorno están correctamente configuradas.\n');
  } else if (totalWarnings > 0 && totalErrors === 0) {
    console.log(`⚠️  ${totalWarnings} advertencia(s) — no bloquea el arranque.\n`);
  } else if (process.env.NODE_ENV === 'production') {
    console.error(`❌ ${totalErrors} error(es) — arranque bloqueado en producción.\n`);
    if (require.main === module) process.exit(1);
  } else {
    console.warn(`⚠️  ${totalErrors} error(es) — permitido en desarrollo, bloqueado en prod.\n`);
  }
}

main();
