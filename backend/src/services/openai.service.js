// El cliente se inicializa solo si es necesario para evitar errores si no hay API Key
let openai = null;

function obtenerClienteOpenAI() {
  if (openai) return openai;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'tu_clave_api_aqui') {
    throw new Error('OPENAI_API_KEY no configurada en el servidor.');
  }

  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  return openai;
}

/**
 * Analiza un Excel completo usando GPT-4 para extraer clases
 * Funciona con cualquier formato de Excel, sin importar encabezados o estructura
 */
async function analizarExcelConIA(excelData, carreraNombre) {
  try {
    const client = obtenerClienteOpenAI();
    console.log('🤖 Analizando Excel con GPT-4...');

    // Convertir las primeras 30 filas a texto para enviar a GPT-4
    const primerasFilas = excelData.slice(0, 30);
    const textoExcel = JSON.stringify(primerasFilas, null, 2);

    console.log(`📄 Enviando ${primerasFilas.length} filas a GPT-4 para análisis...`);

    const prompt = `Eres un asistente experto en análisis de datos académicos. Te voy a dar las primeras filas de un archivo Excel que contiene la planificación académica de la carrera "${carreraNombre}".

Tu tarea es:
1. IGNORAR cualquier fila de título, encabezado decorativo, o celdas fusionadas
2. IDENTIFICAR en qué fila empiezan las columnas reales de datos
3. DETECTAR las columnas que contienen: materia/asignatura, docente/profesor, día, horario, número de estudiantes, aula/salón
4. EXTRAER todas las clases (una por fila de datos)

DATOS DEL EXCEL:
${textoExcel}

IMPORTANTE:
- Las columnas pueden tener CUALQUIER nombre (MATERIA, Asignatura, Curso, etc.)
- El horario puede estar en una sola columna ("08:00-10:00") o en dos columnas separadas (inicio y fin)
- El número de estudiantes puede estar escrito de varias formas ("25", "Nro. 25", "25 alumnos", etc.)
- Ignora filas vacías o que no sean clases reales
- Si una fila tiene información incompleta pero tiene materia, inclúyela de todas formas

Devuelve SOLO un JSON válido con este formato (sin texto adicional):
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
      "materia": "Introducción a la Programación",
      "ciclo": "1",
      "paralelo": "A",
      "dia": "Lunes",
      "hora_inicio": "08:00",
      "hora_fin": "10:00",
      "num_estudiantes": 25,
      "docente": "Juan Pérez",
      "aula": "LAB 1"
    }
  ]
}

Si no puedes determinar algún campo, usa null. SOLO devuelve el JSON, sin explicaciones.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",  // GPT-4 Optimized (más rápido y barato)
      messages: [
        {
          role: "system",
          content: "Eres un experto en análisis de datos académicos. Siempre devuelves JSON válido sin texto adicional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,  // Muy bajo para respuestas consistentes
      max_tokens: 4000
    });

    const respuesta = completion.choices[0].message.content;
    console.log('🤖 Respuesta de GPT-4 recibida');

    // Limpiar la respuesta por si GPT-4 agregó markdown
    let jsonLimpio = respuesta.trim();
    if (jsonLimpio.startsWith('```json')) {
      jsonLimpio = jsonLimpio.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonLimpio.startsWith('```')) {
      jsonLimpio = jsonLimpio.replace(/```\n?/g, '');
    }

    const resultado = JSON.parse(jsonLimpio);

    console.log('✅ Análisis completado:');
    console.log(`   📊 Fila de inicio de datos: ${resultado.fila_inicio_datos}`);
    console.log(`   📋 Clases detectadas: ${resultado.clases.length}`);
    console.log(`   🔍 Columnas identificadas:`, Object.keys(resultado.columnas_detectadas).filter(k => resultado.columnas_detectadas[k]));

    // Si GPT-4 solo analizó las primeras filas, procesar el resto del Excel
    // usando las columnas detectadas
    if (resultado.fila_inicio_datos && resultado.columnas_detectadas.materia) {
      console.log('📚 Procesando el resto del Excel con columnas detectadas...');
      const clasesAdicionales = procesarRestanteExcel(
        excelData,
        resultado.fila_inicio_datos,
        resultado.columnas_detectadas
      );

      resultado.clases = resultado.clases.concat(clasesAdicionales);
      console.log(`✅ Total de clases extraídas: ${resultado.clases.length}`);
    }

    return resultado;

  } catch (error) {
    console.error('❌ Error al analizar Excel con IA:', error.message);

    if (error.status === 401) {
      throw new Error('API Key de OpenAI inválida. Configura OPENAI_API_KEY en .env');
    }

    throw error;
  }
}

/**
 * Procesa el resto del Excel usando las columnas detectadas por GPT-4
 */
function procesarRestanteExcel(excelData, filaInicio, columnasDetectadas) {
  const clasesAdicionales = [];

  // Procesar desde la fila 30 (GPT-4 ya procesó las primeras 30)
  for (let i = 30; i < excelData.length; i++) {
    const fila = excelData[i];

    // Extraer datos usando las columnas detectadas
    const materia = fila[columnasDetectadas.materia];

    // Si no hay materia, saltar esta fila
    if (!materia || materia.trim() === '') continue;

    const clase = {
      materia: materia.trim(),
      ciclo: null,
      paralelo: null,
      dia: fila[columnasDetectadas.dia] || null,
      hora_inicio: null,
      hora_fin: null,
      num_estudiantes: extraerNumeroEstudiantes(fila[columnasDetectadas.estudiantes]),
      docente: fila[columnasDetectadas.docente] || null,
      aula: fila[columnasDetectadas.aula] || null
    };

    // Procesar horario
    const horario = fila[columnasDetectadas.horario];
    if (horario && typeof horario === 'string') {
      const partesHora = horario.split('-');
      if (partesHora.length === 2) {
        clase.hora_inicio = partesHora[0].trim();
        clase.hora_fin = partesHora[1].trim();
      }
    }

    clasesAdicionales.push(clase);
  }

  return clasesAdicionales;
}

/**
 * Extrae el número de estudiantes de un campo que puede tener varios formatos
 */
function extraerNumeroEstudiantes(valor) {
  if (!valor) return 0;

  // Si ya es un número
  if (typeof valor === 'number') return Math.floor(valor);

  // Si es string, extraer el primer número
  const match = String(valor).match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Verifica si la API Key de OpenAI está configurada
 */
function esOpenAIConfigurado() {
  return !!(process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'tu_clave_api_aqui' &&
    process.env.OPENAI_API_KEY.length > 20);
}

module.exports = {
  analizarExcelConIA,
  esOpenAIConfigurado
};
