/**
 * Servicio de IA Multi-Proveedor
 * Soporta: DeepSeek | OpenAI
 *
 * El proveedor activo se controla con la variable AI_PROVIDER en .env.
 * DeepSeek es 100% compatible con el SDK de OpenAI (solo cambia baseURL).
 */

// ── Configuracion por proveedor ───────────────────────────────────────────────

const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
  },
  openai: {
    name: 'OpenAI',
    baseURL: null,
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
  },
};

// ── Estado del cliente ────────────────────────────────────────────────────────

let _client = null;
let _activeProvider = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProviderConfig() {
  const providerName = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const config = PROVIDERS[providerName];

  if (!config) {
    throw new Error(`AI_PROVIDER="${providerName}" no es valido. Usa: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey || apiKey.length < 10) {
    throw new Error(`${config.apiKeyEnv} no esta configurada en .env (proveedor: ${config.name})`);
  }

  const model = process.env[config.modelEnv] || config.defaultModel;
  return { ...config, apiKey, model, providerName };
}

function obtenerCliente() {
  if (_client) return { client: _client, config: _activeProvider };

  const config = getProviderConfig();
  const OpenAI = require('openai');

  const clientOptions = { apiKey: config.apiKey };
  if (config.baseURL) {
    clientOptions.baseURL = config.baseURL;
  }

  _client = new OpenAI(clientOptions);
  _activeProvider = config;

  console.log(`Robot IA inicializada: ${config.name} (${config.model})`);
  return { client: _client, config };
}

function resetCliente() {
  _client = null;
  _activeProvider = null;
}

// ── Verificacion de disponibilidad ───────────────────────────────────────────

function esIAConfigurado() {
  if (String(process.env.AI_ENABLED).toLowerCase() === 'false') return false;
  try {
    getProviderConfig();
    return true;
  } catch {
    return false;
  }
}

const esOpenAIConfigurado = esIAConfigurado;

// ── Funcion principal de chat ─────────────────────────────────────────────────

async function chat(messages, options = {}) {
  const { client, config } = obtenerCliente();

  const params = {
    model: config.model,
    messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.1,
    max_tokens: options.max_tokens || 4000,
  };

  const completion = await client.chat.completions.create(params);

  if (completion.usage) {
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;
    console.log(`Robot IA (${config.name}/${config.model}) tokens: ${prompt_tokens} in + ${completion_tokens} out = ${total_tokens} total`);
  }

  return completion.choices[0].message.content;
}

// ── Analisis de Excel con IA ──────────────────────────────────────────────────

async function analizarExcelConIA(excelData, carreraNombre) {
  try {
    const { config } = obtenerCliente();
    console.log(`Robot Analizando Excel con ${config.name} (${config.model})...`);

    const primerasFilas = excelData.slice(0, 30);
    const textoExcel = JSON.stringify(primerasFilas, null, 2);
    console.log(`Enviando ${primerasFilas.length} filas a ${config.name} para analisis...`);

    const prompt = `Eres un asistente experto en analisis de datos academicos. Te voy a dar las primeras filas de un archivo Excel que contiene la planificacion academica de la carrera "${carreraNombre}".

Tu tarea es:
1. IGNORAR cualquier fila de titulo, encabezado decorativo, o celdas fusionadas
2. IDENTIFICAR en que fila empiezan las columnas reales de datos
3. DETECTAR las columnas que contienen: materia/asignatura, docente/profesor, dia, horario, numero de estudiantes, aula/salon
4. EXTRAER todas las clases (una por fila de datos)

DATOS DEL EXCEL:
${textoExcel}

IMPORTANTE:
- Las columnas pueden tener CUALQUIER nombre (MATERIA, Asignatura, Curso, etc.)
- El horario puede estar en una sola columna ("08:00-10:00") o en dos columnas separadas (inicio y fin)
- El numero de estudiantes puede estar escrito de varias formas ("25", "Nro. 25", "25 alumnos", etc.)
- Ignora filas vacias o que no sean clases reales
- Si una fila tiene informacion incompleta pero tiene materia, incluyela de todas formas

Devuelve SOLO un JSON valido con este formato (sin texto adicional):
{
  "fila_inicio_datos": 2,
  "columnas_detectadas": {
    "materia": "nombre_columna_materia",
    "docente": "nombre_columna_docente",
    "dia": "nombre_columna_dia",
    "horario": "nombre_columna_horario",
    "estudiantes": "nombre_columna_estudiantes",
    "aula": "nombre_columna_aula"
  },
  "clases": [
    {
      "materia": "Introduccion a la Programacion",
      "ciclo": "1",
      "paralelo": "A",
      "dia": "Lunes",
      "hora_inicio": "08:00",
      "hora_fin": "10:00",
      "num_estudiantes": 25,
      "docente": "Juan Perez",
      "aula": "LAB 1"
    }
  ]
}

Si no puedes determinar algun campo, usa null. SOLO devuelve el JSON, sin explicaciones.`;

    const respuesta = await chat([
      { role: 'system', content: 'Eres un experto en analisis de datos academicos. Siempre devuelves JSON valido sin texto adicional.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.1, max_tokens: 4000 });

    let jsonLimpio = respuesta.trim();
    if (jsonLimpio.startsWith('```json')) {
      jsonLimpio = jsonLimpio.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonLimpio.startsWith('```')) {
      jsonLimpio = jsonLimpio.replace(/```\n?/g, '');
    }

    const resultado = JSON.parse(jsonLimpio);

    console.log('Analisis completado:');
    console.log(`   Fila de inicio: ${resultado.fila_inicio_datos}`);
    console.log(`   Clases detectadas: ${resultado.clases ? resultado.clases.length : 0}`);

    if (resultado.fila_inicio_datos && resultado.columnas_detectadas && resultado.columnas_detectadas.materia) {
      console.log('Procesando resto del Excel con columnas detectadas...');
      const clasesAdicionales = procesarRestanteExcel(excelData, resultado.fila_inicio_datos, resultado.columnas_detectadas);
      resultado.clases = (resultado.clases || []).concat(clasesAdicionales);
      console.log(`Total clases extraidas: ${resultado.clases.length}`);
    }

    return resultado;

  } catch (error) {
    console.error('Error al analizar Excel con IA:', error.message);

    if (error.status === 401 || (error.message && error.message.includes('401'))) {
      const provider = process.env.AI_PROVIDER || 'openai';
      throw new Error(`API Key de ${provider} invalida o expirada. Verifica ${provider.toUpperCase()}_API_KEY en .env`);
    }

    throw error;
  }
}

// ── Analisis narrativo de distribucion ───────────────────────────────────────

async function analizarReporteDistribucion(estadisticas) {
  const { config } = obtenerCliente();
  console.log(`Generando analisis narrativo con ${config.name}...`);

  const total = estadisticas.total || 0;
  const exitosas = estadisticas.exitosas || 0;
  const fallidas = estadisticas.fallidas || 0;
  const sobrecupos = estadisticas.sobrecupos || 0;
  const pct = total > 0 ? Math.round((exitosas / total) * 100) : 0;

  const prompt = `Eres un analista academico de la UIDE. Se acabo de ejecutar la distribucion automatica de aulas con estos resultados:

- Total de clases: ${total}
- Clases asignadas exitosamente: ${exitosas}
- Clases sin aula (conflicto o falta de espacio): ${fallidas}
- Clases con sobrecupo: ${sobrecupos}
- Porcentaje de exito: ${pct}%

Genera un parrafo de analisis ejecutivo (maximo 4 oraciones) que:
1. Resuma el resultado de forma directa
2. Destaque si hay problemas criticos (muchas clases sin aula o sobrecupos)
3. Sugiera una accion concreta si hay problemas
4. Use un tono profesional y conciso

Devuelve SOLO el texto del parrafo, sin titulos ni formato markdown.`;

  return await chat([
    { role: 'system', content: 'Eres un analista academico conciso y profesional.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.3, max_tokens: 300 });
}

// ── Consulta general IA ───────────────────────────────────────────────────────

async function consultarIA(prompt, contexto) {
  const { config } = obtenerCliente();

  const messages = [];
  if (contexto) {
    messages.push({ role: 'system', content: contexto });
  }
  messages.push({ role: 'user', content: prompt });

  const respuesta = await chat(messages, { temperature: 0.5, max_tokens: 1000 });

  return {
    respuesta,
    proveedor: config.name,
    modelo: config.model,
  };
}

// ── Helpers privados ──────────────────────────────────────────────────────────

function procesarRestanteExcel(excelData, filaInicio, columnasDetectadas) {
  const clasesAdicionales = [];

  for (let i = 30; i < excelData.length; i++) {
    const fila = excelData[i];
    const materia = fila[columnasDetectadas.materia];
    if (!materia || String(materia).trim() === '') continue;

    const clase = {
      materia: String(materia).trim(),
      ciclo: null,
      paralelo: null,
      dia: fila[columnasDetectadas.dia] || null,
      hora_inicio: null,
      hora_fin: null,
      num_estudiantes: extraerNumeroEstudiantes(fila[columnasDetectadas.estudiantes]),
      docente: fila[columnasDetectadas.docente] || null,
      aula: fila[columnasDetectadas.aula] || null,
    };

    const horario = fila[columnasDetectadas.horario];
    if (horario && typeof horario === 'string') {
      const partes = horario.split('-');
      if (partes.length === 2) {
        clase.hora_inicio = partes[0].trim();
        clase.hora_fin = partes[1].trim();
      }
    }

    clasesAdicionales.push(clase);
  }

  return clasesAdicionales;
}

function extraerNumeroEstudiantes(valor) {
  if (!valor) return 0;
  if (typeof valor === 'number') return Math.floor(valor);
  const match = String(valor).match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  analizarExcelConIA,
  analizarReporteDistribucion,
  consultarIA,
  chat,
  esIAConfigurado,
  esOpenAIConfigurado,
  resetCliente,
  getProviderInfo: function() {
    try {
      const config = getProviderConfig();
      return { proveedor: config.name, modelo: config.model, habilitado: esIAConfigurado() };
    } catch {
      return { proveedor: null, modelo: null, habilitado: false };
    }
  },
};
