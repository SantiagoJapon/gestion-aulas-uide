// ============================================
// SERVICIO: Parser Inteligente de Excel
// Maneja multiples hojas, celdas fusionadas,
// valores multi-linea y deteccion dinamica de columnas
// ============================================

const XLSX = require('xlsx');

// Palabras clave para detectar columnas (normalizadas, sin acentos).
// ORDEN CRITICO: campos mas especificos PRIMERO para que se procesen antes
// que los genericos. Ej: "codigo" antes de "materia" para que
// "CODIGO DE LA MATERIA" no matchee con 'materia'.
const COLUMN_KEYWORDS = {
  // --- Especificos primero para evitar falsos positivos ---
  codigo: ['codigo de la materia', 'codigo de materia', 'codigo materia', 'cod materia', 'codigo', 'cod', 'cod.'],
  horas_materia: ['horas materia', 'nro horas', 'nro  horas', '# de horas', '# de hor',
    'total horas clase', 'total horas', 'horas totales', 'horas docente',
    'num horas', 'numero horas', 'total horas materia'],
  horas_teoricas: ['horas teoricas', 'teoricas', 'componente docente', 'componente academico'],
  horas_practicas: ['horas practicas', 'practicas', 'componente practico'],
  aula_numero: ['aula nro', 'aula numero', 'salon nro'],

  // --- Luego los campos principales ---
  materia: ['materia', 'asignatura', 'nombre materia', 'nombre de la materia', 'nombre de materia',
    'nombre asignatura', 'nombre de la asignatura', 'nombre de asignatura',
    'curso', 'unidad curricular', 'unidad de aprendizaje',
    'componente curricular', 'taller', 'catedra', 'modulo',
    'actividad curricular', 'actividad academica'],
  docente: ['docente', 'nombre docente', 'nombre del docente', 'nombre de docente',
    'profesor', 'nombre profesor', 'nombre del profesor',
    'teacher', 'instructor', 'catedratico', 'facilitador', 'responsable',
    'profesor responsable', 'tutor', 'nombres', 'apellidos y nombres', 'titular'],
  titulo_pregrado: ['titulo pregrado', 'pregrado', 'título pregrado'],
  titulo_posgrado: ['titulo posgrado', 'posgrado', 'postgrado', 'título posgrado'],
  email: ['email', 'correo electro', 'correo', 'mail'],
  tipo_docente: ['tiempo completo', 'tiempo parcial', 'tipo docente', 'dedicacion', 'categoria'],
  dia: ['dia de clase', 'dia clase', 'horario dia', 'dia horario', 'dias', 'dia', 'jornada'],
  hora: ['hora clase', 'horario hora', '# horarios', 'horarios', 'hora',
    'horario de clase', 'franja horaria', 'franja'],
  hora_inicio: ['hora_inicio', 'hora inicio', 'inicio', 'desde'],
  hora_fin: ['hora_fin', 'hora fin', 'fin', 'hasta'],
  estudiantes: [
    '# estudiantes', 'nro estudiantes', 'num estudiantes',
    'numero estudiantes', 'numero de estudiantes', 'cantidad estudiantes',
    'nro alumnos', 'num alumnos', 'nro  alumnos',
    '# alumnos', 'numero alumnos', 'numero de alumnos', 'cantidad alumnos',
    '# estudiante', 'nro estudiante', 'num estudiante',   // formas singulares
    '# alumno', 'nro alumno', 'nro  alumno',              // formas singulares
    'estudiantes', 'alumnos', 'estudiante', 'alumno',      // palabras sueltas
    'inscritos', 'matriculados', 'cupos', 'capacidad'      // sinonimos
  ],
  paralelo: ['paralelo', 'grupo', 'seccion', 'paralelo/grupo', 'division', 'comision', 'nrc'],
  ciclo: ['ciclo', 'nivel', 'semestre', 'nivel/ciclo', 'ano', 'grado', 'curso academico', 'periodo academico'],
  aula: ['aula/lab', 'aula / lab', 'tipo aula', 'aula', 'salon', 'lab', 'laboratorio',
    'virtual', 'espacio', 'sala', 'ambiente', 'espacio fisico', 'lugar', 'recinto'],
  malla: ['malla', 'plan estudios', 'plan de estudios', 'pensum'],
  modalidad: ['modalidad', 'tipo asistencia'],
  creditos: ['creditos', 'credito'],
};

// Palabras que indican que una columna NO es "hora" de horario sino "horas" de conteo
const HORA_EXCLUSION_WORDS = [
  'horas', 'teoricas', 'practicas', 'nro', 'total', '#', 'numero',
  'componente', 'creditos', 'materia', 'docencia'
];

// Columnas que NUNCA deben mapearse a campos de datos (son indices/contadores)
const INDEX_COLUMN_PATTERNS = [
  /^n\s*[°ºª.#]?$/i,  // N°, N., Nº, N ª, N#, N °, N # (con o sin espacio)
  /^nro\.?$/i,         // Nro, Nro.
  /^#$/,               // #
  /^no\.?$/i,          // No, No.
  /^item$/i,           // Item
  /^ord(en)?$/i,       // Ord, Orden
];

/**
 * Normaliza texto para comparacion (quita acentos, lowercase, trim)
 */
function normalize(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.]/g, ' ')  // "Nro.Estudiantes" -> "nro estudiantes"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpia y normaliza un valor de texto para evitar errores de espaciado
 */
function cleanText(text) {
  if (!text) return '';
  return String(text)
    .trim()                    // Quitar espacios al inicio y final
    .replace(/\s+/g, ' ')      // Multiple espacios a uno solo
    .replace(/\r\n|\r|\n/g, ' ') // Saltos de línea a espacios
    .replace(/,\s*,/g, ',')   // Comas dobles a simple
    .replace(/\s+,\s*/g, ',') // Espacios alrededor de comas
    .replace(/\s+-\s*/g, ' - ') // Espacios alrededor de guiones
    .trim();
}

/**
 * Extrae notas de asignación de aulas del Excel
 * Busca patrones como:
 * - "Laboratorio de Psicología: Psicología"
 * - "Sala de Audiencias: Derecho"
 * - "Aulas 16, 17, 18: Arquitectura Taller de maqueteria"
 * - "Laboratorios 1, 2, 3: Informática"
 * - "EN ROJO ESTÁN LAS CLASES QUE SE DEBERÁN AGENDAR EN LABORATORIO DE PSICOLOGÍA"
 * @param {object} workbook - Workbook de Excel
 * @returns {object} Mapa de carrera/tipo -> aula sugerida
 */
function extractAulaNotas(workbook) {
  const notasAula = {};
  const sheetNames = workbook.SheetNames;

  // Patrones para buscar notas de asignación de aulas
  const patterns = [
    // Pattern: "Tipo Aula: Carrera" o "Aula X: Carrera Descripcion"
    /(?:aula|laboratorio|sala|auditorio)\s*\d*[\s,]*(?:\d[\s,]*)+\s*:\s*([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)/gi,
    // Pattern: "Carrera: Tipo Aula" (cuando dice "Psicología: Laboratorio")
    /([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})\s*:\s*(?:laboratorio|aula|sala|auditorio|taller)/gi,
    // Pattern específico para notas de laboratorio en rojo
    /clases\s+.*\s+laboratorio\s+de\s+([a-záéíóúñ]+)/gi
  ];

  // Mapeo de carreras keywords a nombres normalizados
  const carreraKeywords = {
    'psicologia': 'Psicología',
    'psicología': 'Psicología',
    'derecho': 'Derecho',
    'arquitectura': 'Arquitectura',
    'informatica': 'Informática',
    'informática': 'Informática',
    'sistemas': 'Informática',
    'medicina': 'Medicina',
    'enfermeria': 'Enfermería',
    'enfermería': 'Enfermería',
    'odontologia': 'Odontología',
    'odontología': 'Odontología',
    'ingenieria': 'Ingeniería',
    'ingeniería': 'Ingeniería',
    'administracion': 'Administración',
    'administración': 'Administración',
    'economia': 'Economía',
    'economía': 'Economía',
    'comunicacion': 'Comunicación',
    'comunicación': 'Comunicación',
    'educacion': 'Educación',
    'educación': 'Educación',
    'turismo': 'Turismo',
    'hotelería': 'Hotelería'
  };

  // Mapeo de tipos de aula
  const tipoAulaKeywords = {
    'laboratorio': 'Laboratorio',
    'lab': 'Laboratorio',
    'taller': 'Taller',
    'sala': 'Sala',
    'audiencia': 'Sala de Audiencias',
    'audiencias': 'Sala de Audiencias',
    'auditorio': 'Auditorio',
    'maqueteria': 'Taller de Maquetería',
    'maquetería': 'Taller de Maquetería',
    'informatica': 'Laboratorio de Informática',
    'informática': 'Laboratorio de Informática'
  };

  for (const sheetName of sheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      for (const row of rawData) {
        if (!row || row.length === 0) continue;

        // Convertir fila a texto
        const rowText = row.filter(Boolean).map(v => String(v)).join(' ');
        const rowTextLower = rowText.toLowerCase();

        // Buscar patrones en el texto
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(rowText)) !== null) {
            const matchText = match[0].toLowerCase();
            const foundCarrera = Object.keys(carreraKeywords).find(k => matchText.includes(k));
            const foundTipo = Object.keys(tipoAulaKeywords).find(k => matchText.includes(k));

            if (foundCarrera && foundTipo) {
              const carrera = carreraKeywords[foundCarrera];
              const tipo = tipoAulaKeywords[foundTipo];
              notasAula[carrera] = tipo;
              console.log(`[ExcelParser]   📍 Nota aula detectada: "${carrera}" → "${tipo}"`);
            }
          }
          // Reset regex lastIndex
          pattern.lastIndex = 0;
        }
      }
    } catch (err) {
      // Ignorar errores en hojas individuales
    }
  }

  return notasAula;
}

/**
 * Procesa un buffer de Excel y extrae todas las clases
 * @param {Buffer} buffer - Buffer del archivo Excel
 * @returns {{ clases: Array, hojaUsada: string, totalHojas: number, debug: object }}
 */
function processExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  console.log(`[ExcelParser] Hojas encontradas (${sheetNames.length}): ${sheetNames.join(', ')}`);

  // Extraer notas de asignación de aulas del Excel
  console.log(`[ExcelParser] Extrayendo notas de asignación de aulas...`);
  const notasAula = extractAulaNotas(workbook);
  if (Object.keys(notasAula).length > 0) {
    console.log(`[ExcelParser]   Notas de aula encontradas: ${JSON.stringify(notasAula)}`);
  }

  // Intentar extraer clases de CADA hoja y quedarnos con la que mas produzca
  const resultsBySheet = [];

  for (const sheetName of sheetNames) {
    try {
      const sheet = workbook.Sheets[sheetName];
      const result = processSheet(sheet, sheetName);
      if (result.clases.length > 0) {
        resultsBySheet.push(result);
        console.log(`[ExcelParser]   Hoja "${sheetName}": ${result.clases.length} clases extraidas`);
      } else {
        console.log(`[ExcelParser]   Hoja "${sheetName}": sin clases validas`);
      }
    } catch (err) {
      console.log(`[ExcelParser]   Hoja "${sheetName}": error - ${err.message}`);
    }
  }

  if (resultsBySheet.length === 0) {
    return { clases: [], hojaUsada: 'ninguna', totalHojas: sheetNames.length, notasAula: notasAula, debug: { sheetNames } };
  }

  // Calcular score de calidad para cada hoja
  for (const result of resultsBySheet) {
    const clases = result.clases;
    const total = clases.length;
    if (total === 0) {
      result.qualityScore = 0;
      continue;
    }

    const withDia = clases.filter(c => c.dia && c.dia.length > 0).length;
    const withHora = clases.filter(c => c.hora_inicio && c.hora_inicio.length > 0).length;
    const withDocente = clases.filter(c => c.docente && c.docente.length > 0).length;
    const withEstudiantes = clases.filter(c => c.num_estudiantes > 0).length;
    // NUEVO: Contar clases con metadata de docente (títulos, email)
    const withDocenteMetadata = clases.filter(c =>
      c.docente_metadata && (
        c.docente_metadata.titulo_pregrado ||
        c.docente_metadata.titulo_posgrado ||
        c.docente_metadata.email
      )
    ).length;

    const diaPercent = withDia / total;
    const horaPercent = withHora / total;
    const docentePercent = withDocente / total;
    const estudiantesPercent = withEstudiantes / total;
    const metadataPercent = withDocenteMetadata / total;

    const clasesCompletas = clases.filter(c =>
      c.dia && c.hora_inicio && (c.docente || c.num_estudiantes > 0)
    ).length;

    // MEJORADO: Agregar peso a metadata de docente y hora correctamente parseada
    const qualityMultiplier = (diaPercent * 0.25) + (horaPercent * 0.25) + (docentePercent * 0.15) + (estudiantesPercent * 0.15) + (metadataPercent * 0.2);
    result.qualityScore = clasesCompletas + (total * qualityMultiplier * 0.5);

    // BOOST: Si el nombre de la hoja contiene "PLANIFICACION", aumentar score
    const hojaNorm = result.hojaUsada.toLowerCase();
    if (hojaNorm.includes('planificacion') || hojaNorm.includes('planificación')) {
      result.qualityScore *= 1.3; // 30% más de score
      console.log(`[ExcelParser]   ⚡ BOOST applied to "${result.hojaUsada}" (contains PLANIFICACION)`);
    }

    console.log(`[ExcelParser]   Score "${result.hojaUsada}": ${result.qualityScore.toFixed(1)} (clases=${total}, completas=${clasesCompletas}, dia=${(diaPercent * 100).toFixed(0)}%, hora=${(horaPercent * 100).toFixed(0)}%)`);
  }

  // Determinar si las hojas tienen estructura similar (mismas columnas detectadas)
  // CAMBIO: No combinar automáticamente - usar solo la mejor hoja
  // La combinación automática puede causar problemas de datos inconsistentes
  const sheetsWithData = resultsBySheet.filter(r => r.qualityScore > 0);

  // Ordenar por score descendente
  sheetsWithData.sort((a, b) => b.qualityScore - a.qualityScore);

  // Si la mejor hoja tiene un boost de PLANIFICACION, usarla directamente
  const best = sheetsWithData[0];
  const bestHojaNorm = best.hojaUsada.toLowerCase();

  if (bestHojaNorm.includes('planificacion') || bestHojaNorm.includes('planificación')) {
    console.log(`[ExcelParser] ✅ Seleccionando hoja "${best.hojaUsada}" por tener mayor score (PLANIFICACION)`);

    // ENRIQUECIMIENTO DE CICLO: Si la hoja ganadora no tiene ciclo (0%),
    // intentar obtenerlo de hojas secundarias que si lo tengan (ej: hoja DOCENTES en Arquitectura).
    // Se cruza por normalize(materia) + normalize(paralelo).
    const cicloMissing = best.clases.filter(c => !c.ciclo).length;
    if (cicloMissing > 0 && sheetsWithData.length > 1) {
      // Construir lookup: "materia|paralelo" -> ciclo
      // Solo usar hojas que tengan ciclo en al menos 30% de sus clases
      const cicloLookup = new Map();
      for (let si = 1; si < sheetsWithData.length; si++) {
        const secondary = sheetsWithData[si];
        const withCiclo = secondary.clases.filter(c => c.ciclo).length;
        if (withCiclo / (secondary.clases.length || 1) < 0.3) continue;

        for (const c of secondary.clases) {
          if (!c.ciclo) continue;
          // Clave por materia sola (paralelo puede variar en formato entre hojas)
          const keyM = normalize(c.materia || '');
          const keyMP = normalize(c.materia || '') + '|' + normalize(c.paralelo || '');
          if (!cicloLookup.has(keyMP)) cicloLookup.set(keyMP, c.ciclo);
          if (!cicloLookup.has(keyM)) cicloLookup.set(keyM, c.ciclo);
        }
        console.log(`[ExcelParser]   Ciclo lookup construido desde "${secondary.hojaUsada}": ${cicloLookup.size} entradas`);
      }

      if (cicloLookup.size > 0) {
        let enriched = 0;
        for (const c of best.clases) {
          if (c.ciclo) continue;
          const keyMP = normalize(c.materia || '') + '|' + normalize(c.paralelo || '');
          const keyM = normalize(c.materia || '');
          const cicloFound = cicloLookup.get(keyMP) || cicloLookup.get(keyM);
          if (cicloFound) { c.ciclo = cicloFound; enriched++; }
        }
        if (enriched > 0) {
          console.log(`[ExcelParser]   Enriquecimiento de ciclo: ${enriched}/${best.clases.length} clases actualizadas`);
        }
      }
    }

    return {
      clases: best.clases,
      hojaUsada: best.hojaUsada,
      totalHojas: sheetNames.length,
      allSheetResults: resultsBySheet.map(r => ({ hoja: r.hojaUsada, clases: r.clases.length })),
      debug: best.debug
    };
  }

  // Si hay múltiples hojas con scores muy cercanos, considerar combinación
  if (sheetsWithData.length > 1) {
    const secondScore = sheetsWithData[1].qualityScore;
    const scoreDiff = best.qualityScore - secondScore;

    // Solo combinar si los scores son muy cercanos (menos del 5% de diferencia)
    if (scoreDiff / best.qualityScore < 0.05) {
      const compatibleSheets = sheetsWithData.filter(r => {
        const refKeys = new Set(Object.keys(sheetsWithData[0].debug.columnMap || {}));
        const curKeys = new Set(Object.keys(r.debug.columnMap || {}));
        let overlap = 0;
        for (const k of refKeys) { if (curKeys.has(k)) overlap++; }
        return overlap >= 3;
      });

      if (compatibleSheets.length > 1) {
        // Combinar todas las hojas compatibles
        const allClases = [];
        const hojasUsadas = [];
        for (const sheet of compatibleSheets) {
          // Etiquetar cada clase con su hoja de origen para priorizar en deduplicacion
          for (const c of sheet.clases) { c._hoja = sheet.hojaUsada; }
          allClases.push(...sheet.clases);
          hojasUsadas.push(sheet.hojaUsada);
        }

        console.log(`[ExcelParser] Combinando ${compatibleSheets.length} hojas compatibles: ${hojasUsadas.join(', ')} (${allClases.length} clases total)`);

        // Deduplicar clases que aparecen en multiples hojas
        const dedupClases = deduplicateClasses(allClases);

        return {
          clases: dedupClases,
          hojaUsada: hojasUsadas.join(' + '),
          totalHojas: sheetNames.length,
          allSheetResults: resultsBySheet.map(r => ({ hoja: r.hojaUsada, clases: r.clases.length })),
          debug: compatibleSheets[0].debug
        };
      }
    }
  }

  // Si las hojas no son compatibles o no se combinaron, elegir la mejor por score
  // (Ya está ordenada desde arriba)
  console.log(`[ExcelParser] Mejor hoja: "${best.hojaUsada}" con ${best.clases.length} clases (score=${best.qualityScore.toFixed(1)})`);

  // ENRIQUECIMIENTO DE CICLO (mismo que arriba, para el caso sin boost PLANIFICACION)
  const cicloMissingFallback = best.clases.filter(c => !c.ciclo).length;
  if (cicloMissingFallback > 0 && sheetsWithData.length > 1) {
    const cicloLookupFb = new Map();
    for (let si = 1; si < sheetsWithData.length; si++) {
      const secondary = sheetsWithData[si];
      const withCiclo = secondary.clases.filter(c => c.ciclo).length;
      if (withCiclo / (secondary.clases.length || 1) < 0.3) continue;
      for (const c of secondary.clases) {
        if (!c.ciclo) continue;
        const keyMP = normalize(c.materia || '') + '|' + normalize(c.paralelo || '');
        const keyM = normalize(c.materia || '');
        if (!cicloLookupFb.has(keyMP)) cicloLookupFb.set(keyMP, c.ciclo);
        if (!cicloLookupFb.has(keyM)) cicloLookupFb.set(keyM, c.ciclo);
      }
    }
    if (cicloLookupFb.size > 0) {
      let enrichedFb = 0;
      for (const c of best.clases) {
        if (c.ciclo) continue;
        const keyMP = normalize(c.materia || '') + '|' + normalize(c.paralelo || '');
        const keyM = normalize(c.materia || '');
        const found = cicloLookupFb.get(keyMP) || cicloLookupFb.get(keyM);
        if (found) { c.ciclo = found; enrichedFb++; }
      }
      if (enrichedFb > 0) console.log(`[ExcelParser]   Enriquecimiento de ciclo (fallback): ${enrichedFb} clases actualizadas`);
    }
  }

  // Aplicar notas de aula a las clases basándose en la carrera
  if (Object.keys(notasAula).length > 0 && best.clases.length > 0) {
    let appliedCount = 0;
    for (const clase of best.clases) {
      // Buscar coincidencia de carrera en el nombre de la materia o en el campo carrera
      const materiaNorm = normalize(clase.materia || '');
      const carreraNorm = normalize(clase.carrera || '');

      for (const [carrera, tipoAula] of Object.entries(notasAula)) {
        const carreraKey = normalize(carrera);
        if (materiaNorm.includes(carreraKey) || carreraNorm.includes(carreraKey)) {
          clase.aula_sugerida = tipoAula;
          appliedCount++;
          break;
        }
      }
    }
    if (appliedCount > 0) {
      console.log(`[ExcelParser]   Aplicadas ${appliedCount} notas de aula sugerida`);
    }
  }

  return {
    clases: best.clases,
    hojaUsada: best.hojaUsada,
    totalHojas: sheetNames.length,
    allSheetResults: resultsBySheet.map(r => ({ hoja: r.hojaUsada, clases: r.clases.length })),
    notasAula: notasAula,
    debug: best.debug
  };
}

/**
 * Procesa una hoja individual del Excel
 */
function processSheet(sheet, sheetName) {
  // Leer como array de arrays (raw) para tener control total
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawData.length < 3) {
    return { clases: [], hojaUsada: sheetName, debug: { reason: 'less than 3 rows' } };
  }

  // Paso 1: Propagar celdas fusionadas (fill merged cells)
  const merges = sheet['!merges'] || [];
  fillMergedCells(rawData, merges);

  // Paso 2: Encontrar la fila de encabezados
  const headerInfo = findHeaderRow(rawData);
  if (!headerInfo) {
    return { clases: [], hojaUsada: sheetName, debug: { reason: 'no header row found' } };
  }

  const { headerRowIndex, columnMap, subHeaderUsed } = headerInfo;

  // Mostrar la fila raw del header para debugging
  const headerRow = rawData[headerRowIndex];
  const headerCells = headerRow.map((cell, idx) => `${colIdxToLetter(idx)}="${String(cell).substring(0, 25)}"`).filter(s => !s.endsWith('=""'));
  console.log(`[ExcelParser]   Header raw fila ${headerRowIndex}: [${headerCells.join(', ')}]`);
  if (subHeaderUsed && rawData[headerRowIndex + 1]) {
    const subRow = rawData[headerRowIndex + 1];
    const subCells = subRow.map((cell, idx) => `${colIdxToLetter(idx)}="${String(cell).substring(0, 25)}"`).filter(s => !s.endsWith('=""'));
    console.log(`[ExcelParser]   Sub-header raw fila ${headerRowIndex + 1}: [${subCells.join(', ')}]`);
  }

  // Paso 3: Extraer clases desde la fila despues del header
  // Si se detecto sub-header (DIA/HORA debajo de HORARIO), saltar esa fila tambien
  let dataStartRow = headerRowIndex + 1;
  if (subHeaderUsed) {
    console.log(`[ExcelParser]   Saltando sub-header en fila ${dataStartRow}`);
    dataStartRow++;
  }

  // A veces hay una sub-header adicional (PREGRADO/POSGRADO), detectar y saltar
  if (dataStartRow < rawData.length) {
    const nextRow = rawData[dataStartRow];
    const nextRowText = nextRow.map(c => normalize(String(c))).join(' ');
    if (nextRowText.includes('pregrado') || nextRowText.includes('posgrado') ||
      nextRowText.includes('componente') || nextRowText.includes('teorica')) {
      console.log(`[ExcelParser]   Saltando sub-header adicional en fila ${dataStartRow}`);
      dataStartRow++;
    }
  }

  // DEBUG: Mostrar las primeras 3 filas de datos para verificar mapeo
  console.log(`[ExcelParser]   Data comienza en fila ${dataStartRow}. Primeras filas de datos:`);
  for (let dbg = dataStartRow; dbg < Math.min(dataStartRow + 3, rawData.length); dbg++) {
    const row = rawData[dbg];
    if (!row) continue;
    const sample = {};
    for (const [key, colIdx] of Object.entries(columnMap)) {
      sample[key] = row[colIdx] !== undefined ? String(row[colIdx]).substring(0, 40) : '(vacío)';
    }
    console.log(`[ExcelParser]     Fila ${dbg}: ${JSON.stringify(sample)}`);
  }

  let clases = extractClasses(rawData, dataStartRow, columnMap);

  // POST-EXTRACCION: Si la mayoría de "materias" parecen códigos, intentar auto-corregir
  if (clases.length > 0) {
    const CODE_PATTERN = /^[A-Z]{2,5}[\d_][A-Z\d_]{2,}$/;
    const codeLikeCount = clases.filter(c => c.materia && CODE_PATTERN.test(c.materia.trim())).length;
    const codeRatio = codeLikeCount / clases.length;

    if (codeRatio > 0.5) {
      console.warn(`[ExcelParser] ⚠️ ${(codeRatio * 100).toFixed(0)}% de materias parecen CÓDIGOS. Intentando auto-corregir...`);

      // Estrategia: buscar la columna inmediatamente a la derecha de la columna mapeada como 'materia'
      const materiaCol = columnMap.materia;
      const nextCol = materiaCol + 1;

      // Verificar que la siguiente columna no esté asignada a otro campo
      const assignedColValues = new Set(Object.values(columnMap));
      if (!assignedColValues.has(nextCol) && nextCol < rawData[0].length) {
        // Verificar que la siguiente columna tiene texto real (no códigos ni números)
        const sampleValues = [];
        for (let si = dataStartRow; si < Math.min(dataStartRow + 10, rawData.length); si++) {
          const val = getString(rawData[si], nextCol);
          if (val) sampleValues.push(val);
        }
        const hasRealNames = sampleValues.some(v => v.length > 3 && !CODE_PATTERN.test(v.trim()) && !/^\d+$/.test(v.trim()));

        if (hasRealNames) {
          console.log(`[ExcelParser]   Auto-corrigiendo: materia col ${colIdxToLetter(materiaCol)} → ${colIdxToLetter(nextCol)} (muestras: ${sampleValues.slice(0, 3).join(', ')})`);
          // Reasignar: la columna actual pasa a ser 'codigo', la siguiente es 'materia'
          columnMap.codigo = materiaCol;
          columnMap.materia = nextCol;
          // Re-extraer con el mapa corregido
          clases = extractClasses(rawData, dataStartRow, columnMap);
        }
      }
    }
  }

  return {
    clases,
    hojaUsada: sheetName,
    debug: {
      headerRowIndex,
      dataStartRow,
      columnMap,
      totalRawRows: rawData.length,
      mergesCount: merges.length
    }
  };
}

/**
 * Rellena las celdas fusionadas copiando el valor a todas las celdas del rango
 */
function fillMergedCells(data, merges) {
  for (const merge of merges) {
    const { s, e } = merge; // s = start {r, c}, e = end {r, c}
    const value = (data[s.r] && data[s.r][s.c] !== undefined) ? data[s.r][s.c] : '';
    for (let r = s.r; r <= e.r && r < data.length; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (!data[r]) data[r] = [];
        // Solo rellenar si la celda esta vacia
        if (r === s.r && c === s.c) continue; // no tocar la celda original
        if (data[r][c] === '' || data[r][c] === undefined || data[r][c] === null) {
          data[r][c] = value;
        }
      }
    }
  }
}

/**
 * Verifica si una celda de header es una columna de indice/contador (N°, Nro, #, etc.)
 */
function isIndexColumn(cellNorm) {
  if (!cellNorm) return false;
  return INDEX_COLUMN_PATTERNS.some(pattern => pattern.test(cellNorm));
}

/**
 * Convierte indice numerico a letra de columna Excel (0=A, 1=B, 25=Z, 26=AA)
 */
function colIdxToLetter(idx) {
  let letter = '';
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/**
 * Encuentra la fila de encabezados buscando palabras clave
 * Soporta headers de 2 filas (ej: HORARIO en fila 3, DIA/HORA en fila 4)
 * Retorna { headerRowIndex, columnMap }
 */
function findHeaderRow(data) {
  // Buscar en las primeras 25 filas (algunos Excel tienen logos/titulos extensos antes del header)
  const searchRange = Math.min(data.length, 25);

  let bestScore = 0;
  let bestRow = -1;
  let bestMap = null;
  let bestHasSubHeader = false;

  for (let rowIdx = 0; rowIdx < searchRange; rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;

    const map = {};
    let score = 0;
    let subHeaderDetected = false;
    const excludedCols = new Set(); // columnas de indice que deben ignorarse
    const assignedCols = new Set(); // columnas ya asignadas a un campo (evitar doble-mapeo)

    // Paso 0: Identificar columnas de indice (N°, Nro, #) para excluirlas
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellNorm = normalize(String(row[colIdx]));
      if (isIndexColumn(cellNorm)) {
        excludedCols.add(colIdx);
      }
    }

    // Paso 1: Buscar match con cada tipo de columna en la fila principal
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      if (excludedCols.has(colIdx)) continue; // saltar columnas de indice
      if (assignedCols.has(colIdx)) continue; // saltar columnas ya mapeadas a otro campo

      const cellNorm = normalize(String(row[colIdx]));
      if (!cellNorm || cellNorm.length === 0) continue;

      // Buscar match con cada tipo de columna.
      // columnMatched asegura que una columna solo mapee a UN campo
      // (evita que "# ESTUDIANTES" matchee a dia por subcadena "dia" Y tambien a estudiantes)
      let columnMatched = false;
      for (const [key, keywords] of Object.entries(COLUMN_KEYWORDS)) {
        if (columnMatched) break; // esta columna ya fue asignada a un campo
        if (map[key] !== undefined) continue; // ya encontrada

        for (const kw of keywords) {
          const isExact = cellNorm === kw;
          const isPartial = !isExact && cellNorm.includes(kw);

          if (isExact || isPartial) {
            // --- Guards de exclusion por campo ---

            // Guard MATERIA: si contiene "codigo"/"cod ", es columna de codigos, no de nombres
            if (key === 'materia' && (cellNorm.includes('codigo') || cellNorm.includes('cod '))) {
              break; // no seguir probando keywords de materia para esta celda
            }
            // Guard MATERIA: si contiene "horas", es conteo de horas
            if (key === 'materia' && cellNorm.includes('horas')) {
              break;
            }
            // Guard MATERIA EXTRA: no permitir que "docente"/"profesor"/"tutor" matchee con materia
            if (key === 'materia' && (cellNorm.includes('docente') || cellNorm.includes('profesor') || cellNorm.includes('docencia') || cellNorm.includes('tutor') || cellNorm.includes('facilitador'))) {
              break;
            }
            // Guard CICLO: si contiene "componente", es componente academico no ciclo
            if (key === 'ciclo' && cellNorm.includes('componente')) {
              break;
            }
            // Guard HORA: "horario"/"horarios" es un grupo-header, no la columna hora
            if (key === 'hora' && (cellNorm === 'horario' || cellNorm === 'horarios')) {
              break;
            }
            // Guard HORA: columnas de conteo de horas no son "hora" de horario
            if (key === 'hora' && HORA_EXCLUSION_WORDS.some(w => cellNorm.includes(w))) {
              break;
            }
            // Guard HORA ESPECIAL: Si la columna es "# horarios" o similar,
            // verificar si contiene formato combinado (dia: hora) antes de mapear
            if (key === 'hora' && (cellNorm === '# horarios' || cellNorm === 'horarios')) {
              // NO mapear aquí, déjalo para después - se detectará en el análisis de datos
              break;
            }
            // Guard AULA: si ya existe aula_numero, preferirla
            if (key === 'aula' && map.aula_numero !== undefined) {
              break;
            }
            // Guard EMAIL: si contiene "titulo" o "pregrado" o "posgrado", no es email
            if (key === 'email' && (cellNorm.includes('titulo') || cellNorm.includes('pregrado') || cellNorm.includes('posgrado'))) {
              break;
            }

            map[key] = colIdx;
            assignedCols.add(colIdx); // marcar columna como ocupada
            score++;
            columnMatched = true; // señal para romper el loop de keys
            break;
          }
        }
      }
    }

    // Paso 2: Verificar sub-header en la siguiente fila
    if (rowIdx + 1 < searchRange) {
      const nextRow = data[rowIdx + 1];
      if (nextRow && nextRow.length > 0) {
        const isDiaKw = (s) => COLUMN_KEYWORDS.dia.some(kw => s === kw || s.includes(kw));
        const isHoraKw = (s) => {
          if (s === 'horario' || s === 'horarios') return false;
          if (s.includes('horas materia') || s.includes('nro') || s.includes('total')) return false;
          return COLUMN_KEYWORDS.hora.some(kw => s === kw || s.includes(kw));
        };
        const isPregradoKw = (s) => s.includes('pregrado') || s.includes('posgrado') || s.includes('postgrado');
        const isHorasTeoricasKw = (s) => COLUMN_KEYWORDS.horas_teoricas.some(kw => s === kw || s.includes(kw));
        const isHorasPracticasKw = (s) => COLUMN_KEYWORDS.horas_practicas.some(kw => s === kw || s.includes(kw));

        // Detectar que tipos de sub-headers hay
        let hasDiaHoraSubHeader = false;
        let hasTituloSubHeader = false;
        let hasHorasSubHeader = false;
        for (let colIdx = 0; colIdx < nextRow.length; colIdx++) {
          const cellNorm = normalize(String(nextRow[colIdx]));
          if (isDiaKw(cellNorm) || isHoraKw(cellNorm)) hasDiaHoraSubHeader = true;
          if (isPregradoKw(cellNorm)) hasTituloSubHeader = true;
          if (isHorasTeoricasKw(cellNorm) || isHorasPracticasKw(cellNorm)) hasHorasSubHeader = true;
        }

        if (hasDiaHoraSubHeader || hasTituloSubHeader || hasHorasSubHeader) {
          subHeaderDetected = true;

          // Solo eliminar dia/hora del parent SI el sub-header tiene dia/hora
          // (evitar borrar dia/hora validos cuando solo hay sub-header de PREGRADO)
          if (hasDiaHoraSubHeader) {
            if (map.hora !== undefined) { delete map.hora; score--; }
            if (map.dia !== undefined) { delete map.dia; score--; }
          }

          // Si hay sub-header de horas, eliminar horas_teoricas/practicas del parent
          // ya que el parent probablemente tiene un grupo-header como "HORAS MATERIA"
          if (hasHorasSubHeader) {
            if (map.horas_teoricas !== undefined) { delete map.horas_teoricas; score--; }
            if (map.horas_practicas !== undefined) { delete map.horas_practicas; score--; }
          }

          // Escanear sub-header para mapear columnas
          for (let colIdx = 0; colIdx < nextRow.length; colIdx++) {
            if (excludedCols.has(colIdx)) continue;
            const cellNorm = normalize(String(nextRow[colIdx]));
            if (!cellNorm || cellNorm.length === 0) continue;

            if (hasDiaHoraSubHeader) {
              if (isDiaKw(cellNorm) && map.dia === undefined) { map.dia = colIdx; score++; }
              else if (isHoraKw(cellNorm) && map.hora === undefined) { map.hora = colIdx; score++; }
            }
            if (hasTituloSubHeader) {
              if (cellNorm.includes('pregrado') && !cellNorm.includes('posgrado') && map.titulo_pregrado === undefined) {
                map.titulo_pregrado = colIdx; score++;
              } else if ((cellNorm.includes('posgrado') || cellNorm.includes('postgrado')) && map.titulo_posgrado === undefined) {
                map.titulo_posgrado = colIdx; score++;
              }
            }
            if (hasHorasSubHeader) {
              if (isHorasTeoricasKw(cellNorm) && map.horas_teoricas === undefined) {
                map.horas_teoricas = colIdx; score++;
              } else if (isHorasPracticasKw(cellNorm) && map.horas_practicas === undefined) {
                map.horas_practicas = colIdx; score++;
              }
              // "TOTAL" en sub-header de horas = total horas materia
              if (cellNorm === 'total' && map.horas_materia === undefined) {
                map.horas_materia = colIdx; score++;
              }
            }
          }
        }
      }
    }

    // Si encontramos al menos materia + alguna otra columna relevante, es candidata
    if (map.materia !== undefined && score >= 2 && score > bestScore) {
      bestScore = score;
      bestRow = rowIdx;
      bestMap = { ...map };
      bestHasSubHeader = subHeaderDetected;

      // Log candidato para debug
      const colLetters = {};
      for (const [k, v] of Object.entries(map)) colLetters[k] = `${colIdxToLetter(v)}(${v})`;
      console.log(`[ExcelParser]   Candidato header fila ${rowIdx} (score=${score}, excluidas=[${[...excludedCols].map(c => colIdxToLetter(c)).join(',')}]): ${JSON.stringify(colLetters)}`);
    }
  }

  if (bestRow === -1 || !bestMap) {
    return null;
  }

  // Validacion post-mapeo: verificar que materia y docente no apunten a la misma columna
  if (bestMap.materia === bestMap.docente) {
    console.warn(`[ExcelParser] ⚠️ materia y docente apuntan a la misma columna ${colIdxToLetter(bestMap.materia)}! Posible error.`);
  }

  // FALLBACK: Si no hay dia ni hora mapeados, buscar columna con formato combinado "DIA: HORA"
  // Esto ocurre en hojas como "CODIGOS DE SILABOS" donde "# HORARIOS" contiene "LUNES: 08H00 - 10H00"
  if (bestMap.dia === undefined && bestMap.hora === undefined && bestMap.hora_inicio === undefined) {
    const dataStart = bestHasSubHeader ? bestRow + 2 : bestRow + 1;
    const assignedCols = new Set(Object.values(bestMap));
    const combinedDiaHoraPattern = /[a-záéíóúñ]+\s*:\s*\d{1,2}[hH:]\d{2}/i;

    for (let colIdx = 0; colIdx < (data[bestRow] || []).length; colIdx++) {
      if (assignedCols.has(colIdx)) continue;
      // Revisar las primeras 5 filas de datos para detectar el patron combinado
      let matchCount = 0;
      for (let ri = dataStart; ri < Math.min(dataStart + 5, data.length); ri++) {
        const val = data[ri] && data[ri][colIdx] ? String(data[ri][colIdx]) : '';
        if (combinedDiaHoraPattern.test(val)) matchCount++;
      }
      if (matchCount >= 2) {
        bestMap.hora = colIdx;
        console.log(`[ExcelParser]   FALLBACK: Columna ${colIdxToLetter(colIdx)} detectada como DIA:HORA combinado (${matchCount} matches)`);
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // INFERENCIA POR DATOS: Para columnas criticas aun no detectadas por
  // keywords, escanear las primeras filas de datos y deducir el tipo
  // por los valores que contienen.
  // Aplica solo si hay un header detectado (bestRow >= 0).
  // ─────────────────────────────────────────────────────────────────────
  {
    const inferDataStart = bestHasSubHeader ? bestRow + 2 : bestRow + 1;
    const inferSampleEnd = Math.min(inferDataStart + 15, data.length);
    const inferMaxCols = Math.max(...data.slice(inferDataStart, inferSampleEnd).map(r => (r || []).length), 0);
    // Reusar el Set de columnas ya asignadas (puede haber sido actualizado por el FALLBACK anterior)
    const inferAssigned = new Set(Object.values(bestMap));

    // Patrones de reconocimiento
    const DIA_NAMES = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']);
    const TIME_RE = /\d{1,2}[:\-hH]\d{2}/;
    const COMBINED_RE = /[a-záéíóú]+\s*:\s*\d{1,2}[hH:]\d{2}/i;

    /**
     * Cuenta cuantas filas de muestra tienen un valor que pasa el predicado.
     */
    function inferScore(colIdx, predicate) {
      let score = 0;
      for (let ri = inferDataStart; ri < inferSampleEnd; ri++) {
        const val = (data[ri] && data[ri][colIdx] !== undefined && data[ri][colIdx] !== null)
          ? String(data[ri][colIdx]).trim() : '';
        if (val && predicate(val)) score++;
      }
      return score;
    }

    // 1. INFERIR DIA ─────────────────────────────────────────────────────
    if (bestMap.dia === undefined) {
      let bestCol = -1, bestScore = 0;
      for (let c = 0; c < inferMaxCols; c++) {
        if (inferAssigned.has(c)) continue;
        const s = inferScore(c, v => DIA_NAMES.has(normalize(v)));
        if (s > bestScore) { bestScore = s; bestCol = c; }
      }
      if (bestScore >= 2) {
        bestMap.dia = bestCol;
        inferAssigned.add(bestCol);
        console.log(`[ExcelParser]   INFERIDO(data): col ${colIdxToLetter(bestCol)} → dia (${bestScore} matches)`);
      }
    }

    // 2. INFERIR HORA ────────────────────────────────────────────────────
    if (bestMap.hora === undefined && bestMap.hora_inicio === undefined) {
      let bestCol = -1, bestScore = 0;
      for (let c = 0; c < inferMaxCols; c++) {
        if (inferAssigned.has(c)) continue;
        // Preferir columna con formato combinado "DIA: HH:MM" sobre solo tiempo
        const sCombined = inferScore(c, v => COMBINED_RE.test(v));
        const sTime = inferScore(c, v => TIME_RE.test(v));
        const s = sCombined > 0 ? sCombined * 2 : sTime; // dar doble peso al combinado
        if (s > bestScore) { bestScore = s; bestCol = c; }
      }
      if (bestScore >= 2) {
        bestMap.hora = bestCol;
        inferAssigned.add(bestCol);
        console.log(`[ExcelParser]   INFERIDO(data): col ${colIdxToLetter(bestCol)} → hora (${bestScore} matches)`);
      }
    }

    // 3. INFERIR MATERIA (último recurso si no se detectó por keyword) ──
    if (bestMap.materia === undefined) {
      let bestCol = -1, bestScore = 0;
      for (let c = 0; c < inferMaxCols; c++) {
        if (inferAssigned.has(c)) continue;
        // Una materia es texto largo (>= 5 chars), con letras, sin ser solo número
        const s = inferScore(c, v => v.length >= 5 && /[a-záéíóúA-ZÁÉÍÓÚ]/.test(v) && !/^\d+$/.test(v) && !TIME_RE.test(v));
        if (s > bestScore) { bestScore = s; bestCol = c; }
      }
      if (bestScore >= 3) {
        bestMap.materia = bestCol;
        inferAssigned.add(bestCol);
        console.log(`[ExcelParser]   INFERIDO(data): col ${colIdxToLetter(bestCol)} → materia (${bestScore} matches)`);
      }
    }

    // 4. INFERIR DOCENTE (solo si materia ya existe) ─────────────────────
    if (bestMap.docente === undefined && bestMap.materia !== undefined) {
      let bestCol = -1, bestScore = 0;
      for (let c = 0; c < inferMaxCols; c++) {
        if (inferAssigned.has(c)) continue;
        // Docente: texto con espacios, mayúsculas, longitud razonable, sin hora
        const s = inferScore(c, v =>
          v.length >= 8
          && v.includes(' ')
          && /[A-ZÁÉÍÓÚÑ]{2,}/.test(v)
          && !TIME_RE.test(v)
          && !/^\d/.test(v)
        );
        if (s > bestScore) { bestScore = s; bestCol = c; }
      }
      if (bestScore >= 3) {
        bestMap.docente = bestCol;
        inferAssigned.add(bestCol);
        console.log(`[ExcelParser]   INFERIDO(data): col ${colIdxToLetter(bestCol)} → docente (${bestScore} matches)`);
      }
    }

    // 5. INFERIR ESTUDIANTES (columna numerica pequeña no asignada) ──────
    if (bestMap.estudiantes === undefined) {
      let bestCol = -1, bestScore = 0;
      for (let c = 0; c < inferMaxCols; c++) {
        if (inferAssigned.has(c)) continue;
        // Número entero entre 1 y 300 (rango realista de estudiantes)
        const s = inferScore(c, v => {
          const n = parseInt(v, 10);
          return !isNaN(n) && n >= 1 && n <= 300 && /^\d{1,3}$/.test(v.trim());
        });
        if (s > bestScore) { bestScore = s; bestCol = c; }
      }
      if (bestScore >= 3) {
        bestMap.estudiantes = bestCol;
        inferAssigned.add(bestCol);
        console.log(`[ExcelParser]   INFERIDO(data): col ${colIdxToLetter(bestCol)} → estudiantes (${bestScore} matches)`);
      }
    }
  }

  // Log final del mapa elegido con letras de columna
  const finalLetters = {};
  for (const [k, v] of Object.entries(bestMap)) finalLetters[k] = `${colIdxToLetter(v)}(${v})`;
  console.log(`[ExcelParser]   Header elegido: fila ${bestRow} → ${JSON.stringify(finalLetters)}`);

  return { headerRowIndex: bestRow, columnMap: bestMap, subHeaderUsed: bestHasSubHeader };
}

/**
 * Extrae clases de las filas de datos usando el mapa de columnas
 * Maneja: filas con datos parciales, multi-linea, propagacion de docente
 */
function extractClasses(data, startRow, columnMap) {
  const clases = [];
  let lastDocente = '';
  let lastCiclo = '';
  let lastParalelo = '';
  let lastMalla = '';
  let lastCodigo = '';
  let lastMateria = '';
  let lastAula = '';
  let lastNumEstudiantes = 0;
  let currentTipoDocente = ''; // Propagado desde secciones "DOCENTES TIEMPO COMPLETO/PARCIAL"
  let materiaPropagationCount = 0; // Contador para limitar propagacion de materia
  const MAX_MATERIA_PROPAGATION = 6; // Max filas sin nueva materia antes de cortar propagacion

  // DETECCION DE FORMATO MATRIZ DE HORARIO: Las hojas con formato de matriz
  // (como "2do", "3er", etc.) tienen la columna de materia llena de dias de la semana
  // Esto causa que se extraigan clases incorrectas
  const DIAS_SEMANA = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
    'lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']);
  const materiaColIdx = columnMap.materia;

  // Si hay columna de materia, verificar las primeras filas de datos
  if (materiaColIdx !== undefined) {
    let diasCount = 0;
    let totalChecked = 0;
    const checkRows = Math.min(startRow + 10, data.length);

    for (let r = startRow; r < checkRows; r++) {
      const row = data[r];
      if (row && row[materiaColIdx]) {
        const val = String(row[materiaColIdx]).trim().toLowerCase();
        if (val && val.length > 0) {
          totalChecked++;
          if (DIAS_SEMANA.has(val) ||
            (val.length >= 3 && val.length <= 10 && /^[a-záéíóúñ]+$/.test(val) &&
              ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].some(d => val.includes(d)))) {
            diasCount++;
          }
        }
      }
    }

    // Si mas del 60% de los valores en columna materia son dias de semana, es una matriz de horario
    if (totalChecked > 3 && (diasCount / totalChecked) > 0.6) {
      console.log(`[ExcelParser]   ⚠️ DETECCION: Formato matriz de horario detectado (${diasCount}/${totalChecked} filas con dias de semana en columna materia) - retornando 0 clases`);
      return clases; // Retornar array vacio
    }
  }

  // Palabras clave que indican cambio de seccion (resetear propagacion)
  const SECTION_KEYWORDS = ['tiempo completo', 'tiempo parcial', 'docentes tiempo', 'catedraticos', 'profesores tiempo'];

  // LISTA NEGRA: Evitar extraer filas que no son clases
  const MATERIA_BLACK_LIST = [
    'subtotal', 'total', 'receso', 'almuerzo', 'tutor_a', 'atenci_n a estudiantes',
    'gesti_n acad_mica', 'investigaci_n', 'vinculaci_n', 'consejer_a', 'pregrado',
    'posgrado', 'horario', 'malla', 'docente', 'materia', 'total materias',
    'docentes tiempo', 'tiempo completo', 'tiempo parcial', 'escuela de',
    'planificacion academica', 'universidad', 'extension', 'periodo',
    'total horas docencia', 'total horas clase', 'complementarias', 'tesis',
    'investigacion', 'graduados', 'gestion', 'calidad', 'responsable', 'club',
    'distribucion docente', 'tutoria', 'vinculacion', 'consejeria',
    'gestion academica', 'atencion a estudiantes', 'total general',
    'catedraticos', 'profesores', 'coordinacion', 'direccion',
    // Formatos de arquitectura y otras escuelas
    'total de materias', 'mas cultura fisica', 'cultura fisica',
    'practicas de servicio comunitario', 'nuevo profe',
    'panificacion academica', 'planificacion academica',
    // Pie de pagina / firmas / notas
    'revisado y aprobado', 'aprobado por', 'elaborado por',
    'firma', 'cargo', 'director de escuela',
    'coordinador de carrera', 'ajuste de horas',
    'se baja una hora', 'observacion',
  ];

  // Palabras que indican FIN de la tabla de clases (secciones resumen)
  const STOP_SECTION_KEYWORDS = [
    'distribucion docente por semestre', 'distribucion docente',
    'resumen de carga', 'resumen carga', 'resumen general',
    'total de materias por docente', 'carga horaria docente',
    'total materias', 'total materia',
    // Pie de pagina / firmas
    'revisado y aprobado', 'aprobado por', 'elaborado por',
    'firma del director', 'firma del coordinador',
    'director de escuela', 'coordinador de carrera',
    'ajuste de horas por', 'se baja una hora',
    'nota:', 'observacion:', 'observaciones:',
  ];

  let consecutiveEmptyRows = 0; // Detector de fin de tabla por filas vacias consecutivas
  const MAX_EMPTY_ROWS = 3; // Despues de 3 filas vacias consecutivas, asumir fin de datos

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      consecutiveEmptyRows++;
      if (consecutiveEmptyRows >= MAX_EMPTY_ROWS) {
        console.log(`[ExcelParser]   STOP: ${MAX_EMPTY_ROWS} filas vacias consecutivas en fila ${i} - fin de tabla`);
        break;
      }
      continue;
    }

    // Contar celdas no vacias en las columnas mapeadas (no en toda la fila)
    const mappedCols = Object.values(columnMap);
    const nonEmptyMapped = mappedCols.filter(colIdx =>
      row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== ''
    ).length;
    if (nonEmptyMapped === 0) {
      consecutiveEmptyRows++;
      if (consecutiveEmptyRows >= MAX_EMPTY_ROWS) {
        console.log(`[ExcelParser]   STOP: ${MAX_EMPTY_ROWS} filas sin datos en columnas mapeadas - fin de tabla`);
        break;
      }
      continue;
    }
    consecutiveEmptyRows = 0; // reset: fila con datos

    // Concatenar todos los valores de la fila para buscar keywords
    const rowText = row.filter(Boolean).map(v => normalize(String(v))).join(' ');

    // Detectar secciones RESUMEN que indican fin de la tabla de clases
    // IMPORTANTE: Solo hacer STOP si la columna de materia esta vacia o contiene texto blacklisted.
    // Si la materia tiene datos validos, la fila es una fila de datos con notas/anotaciones
    // en columnas laterales (ej: "se baja una hora" en una columna de observaciones).
    if (STOP_SECTION_KEYWORDS.some(kw => rowText.includes(kw))) {
      const materiaVal = getString(row, columnMap.materia);
      const materiaNormForStop = normalize(materiaVal);
      const materiaHasData = materiaVal.length > 2
        && !MATERIA_BLACK_LIST.some(bl => materiaNormForStop.includes(normalize(bl)))
        && !/^\d{1,4}$/.test(materiaVal.trim());

      if (!materiaHasData) {
        console.log(`[ExcelParser]   STOP: Seccion resumen detectada en fila ${i}: "${rowText.substring(0, 80)}..." - deteniendo extraccion`);
        break; // salir completamente del loop
      } else {
        console.log(`[ExcelParser]   Fila ${i}: STOP keyword en fila pero materia="${materiaVal}" tiene datos validos - continuando (notas laterales ignoradas)`);
      }
    }

    // Detectar filas de seccion ("DOCENTES TIEMPO COMPLETO", "DOCENTES TIEMPO PARCIAL")
    const isSection = SECTION_KEYWORDS.some(kw => rowText.includes(kw));
    if (isSection) {
      // Capturar tipo de docente de la seccion
      if (rowText.includes('tiempo completo')) {
        currentTipoDocente = 'Tiempo Completo';
      } else if (rowText.includes('tiempo parcial')) {
        currentTipoDocente = 'Tiempo Parcial';
      }
      // Resetear propagacion al cambiar de seccion
      console.log(`[ExcelParser]   Seccion detectada en fila ${i}: "${rowText.substring(0, 60)}..." (tipo=${currentTipoDocente}) - reseteando propagacion`);
      lastDocente = '';
      lastCiclo = '';
      lastParalelo = '';
      lastMalla = '';
      lastCodigo = '';
      lastMateria = '';
      lastAula = '';
      lastNumEstudiantes = 0;
      continue;
    }

    // Detectar filas de malla ("MALLA 2019", "MALLA 2023") - capturar malla y continuar
    const mallaMatch = rowText.match(/malla\s+(\d{4})/);
    if (mallaMatch && !rowText.includes('docente') && !rowText.includes('materia')) {
      lastMalla = mallaMatch[1];
      console.log(`[ExcelParser]   Malla detectada en fila ${i}: ${lastMalla}`);
      continue;
    }

    // Extraer valores
    const materia = cleanText(getString(row, columnMap.materia));
    let docente = cleanText(getString(row, columnMap.docente));
    let cicloRaw = cleanText(getString(row, columnMap.ciclo));
    let paralelo = cleanText(getString(row, columnMap.paralelo));
    let malla = cleanText(getString(row, columnMap.malla));
    let codigo = cleanText(getString(row, columnMap.codigo));
    // Preferir aula_numero (especifico) sobre aula (generico/tipo)
    const aula = cleanText(getString(row, columnMap.aula_numero)) || cleanText(getString(row, columnMap.aula));

    // Metadatos de docente
    const titulo_pregrado = cleanText(getString(row, columnMap.titulo_pregrado));
    const titulo_posgrado = cleanText(getString(row, columnMap.titulo_posgrado));
    const email = cleanText(getString(row, columnMap.email));
    const tipo_docente = cleanText(getString(row, columnMap.tipo_docente));

    // Estudiantes - puede ser numero o texto
    let numEstudiantes = getNumber(row, columnMap.estudiantes);

    // Horario - extraer valores raw para parseSchedule
    const diaRaw = getString(row, columnMap.dia);
    const horaRaw = getString(row, columnMap.hora);
    const horaInicioRaw = getString(row, columnMap.hora_inicio);
    const horaFinRaw = getString(row, columnMap.hora_fin);

    // PARSEAR CICLO/NIVEL: manejar formatos "1A", "3ro", "4to", etc.
    // y detectar texto sospechoso de pie de pagina
    const cicloResult = parseCicloParalelo(cicloRaw, paralelo);
    if (cicloResult.suspicious) {
      console.log(`[ExcelParser]   Saltando fila ${i}: ciclo sospechoso "${cicloRaw}" (posible pie de pagina)`);
      continue;
    }
    let ciclo = cicloResult.ciclo;
    // Si parseCicloParalelo extrajo un paralelo (ej: "1A" → paralelo=A), usarlo
    if (cicloResult.paralelo && !paralelo) {
      paralelo = cicloResult.paralelo;
    }

    // VALIDACION PREVIA: Si docente es puramente numerico, descartarlo ANTES de propagar
    // para que la propagacion use el ultimo docente valido (no el numero)
    if (docente && /^\d{1,4}$/.test(docente.trim())) {
      docente = '';
    }

    // Propagar valores de celdas fusionadas (docente, ciclo, paralelo)
    if (docente) lastDocente = docente; else docente = lastDocente;
    if (ciclo) lastCiclo = ciclo; else ciclo = lastCiclo;
    if (paralelo) lastParalelo = paralelo; else paralelo = lastParalelo;
    if (malla) lastMalla = malla; else malla = lastMalla;
    if (codigo) lastCodigo = codigo;

    // Si no hay materia, verificar si es una fila de continuacion
    // (misma materia, diferente dia/hora)
    if (!materia) {
      // Verificar si tiene dia y hora (fila de continuacion)
      const dia = getString(row, columnMap.dia);
      const hora = getString(row, columnMap.hora);
      const horaInicio = getString(row, columnMap.hora_inicio);
      if (!dia && !hora && !horaInicio) continue; // fila vacia
      // Es continuacion: usaremos la ultima materia procesada
    }

    // Propagar aula y num_estudiantes para filas de continuacion
    let aulaFinal = aula;
    if (aula) lastAula = aula; else aulaFinal = lastAula;
    if (numEstudiantes > 0) lastNumEstudiantes = numEstudiantes;

    let materiaFinal = materia;
    if (!materiaFinal) {
      // Limitar propagacion: si llevamos muchas filas sin nueva materia, cortar
      materiaPropagationCount++;
      if (materiaPropagationCount > MAX_MATERIA_PROPAGATION) {
        continue; // demasiadas filas sin materia nueva, probablemente ya no es tabla de datos
      }
      materiaFinal = lastMateria;
      if (!numEstudiantes) numEstudiantes = lastNumEstudiantes;
      if (!codigo) codigo = lastCodigo;
    } else {
      materiaPropagationCount = 0; // reset: encontramos una materia nueva
    }

    if (!materiaFinal) continue;

    // VALIDACION: Si materia es puramente numérica, es un N°, ciclo o índice
    if (/^\d{1,4}$/.test(materiaFinal.trim())) {
      continue;
    }

    // VALIDACION: Si materia parece un CÓDIGO (EJ: PP_06_SIMU, CC05A_IFT103)
    // y tenemos una columna de materia real, probablemente tomamos la equivocada
    const looksLikeCode = /^[A-Z]{2,5}[\d_][A-Z\d_]{2,}$/.test(materiaFinal.trim());
    if (looksLikeCode && columnMap.codigo !== undefined && columnMap.materia !== columnMap.codigo) {
      // Si el valor de materia ya existe en el campo codigo, es duplicado
      // Pero si no, tal vez es efectivamente el nombre
    }

    // VALIDACION: Si materia tiene solo 1-2 caracteres, probablemente es un paralelo o indice
    if (materiaFinal.trim().length <= 2) {
      continue;
    }

    // Filtrar por lista negra
    const materiaNorm = normalize(materiaFinal);
    if (MATERIA_BLACK_LIST.some(item => materiaNorm.includes(normalize(item)))) {
      continue;
    }

    lastMateria = materiaFinal;

    // Detectar si paralelo esta dentro del nombre de materia (ej: "Logica de Programacion - A")
    // Solo extraer si no se detecto una columna de paralelo en el header
    if (columnMap.paralelo === undefined && materiaFinal.includes(' - ')) {
      const parts = materiaFinal.split(' - ');
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart.length <= 2) {
        paralelo = lastPart;
        materiaFinal = parts.slice(0, -1).join(' - ').trim();
      }
    }

    // Manejar multiples formatos de horario
    const sessions = parseSchedule(diaRaw, horaRaw, horaInicioRaw, horaFinRaw);

    // Determinar tipo de docente: preferir columna explícita, luego sección
    const tipoDocenteFinal = tipo_docente || currentTipoDocente;

    if (sessions.length === 0) {
      // Guardar sin horario
      clases.push({
        materia: materiaFinal.trim(),
        codigo: codigo || null,
        ciclo: ciclo || null,
        paralelo: paralelo || 'A',
        dia: '',
        hora_inicio: '',
        hora_fin: '',
        num_estudiantes: numEstudiantes,
        docente: docente || '',
        aula: aulaFinal || '',
        docente_metadata: {
          titulo_pregrado,
          titulo_posgrado,
          email,
          tipo: tipoDocenteFinal
        }
      });
    } else {
      // Crear una entrada por cada sesion
      for (const session of sessions) {
        // Manejar aula multi-linea (LAB 2\r\nLAB 1 -> asignar cada aula a cada sesion)
        let aulaSession = aulaFinal;
        if (aulaFinal && aulaFinal.includes('\n')) {
          const aulas = aulaFinal.split(/\r?\n/).map(a => a.trim()).filter(a => a);
          const sessionIdx = sessions.indexOf(session);
          aulaSession = aulas[sessionIdx] || aulas[0] || aulaFinal;
        }

        clases.push({
          materia: materiaFinal.trim(),
          codigo: codigo || null,
          ciclo: ciclo || null,
          paralelo: paralelo || 'A',
          dia: session.dia,
          hora_inicio: session.hora_inicio,
          hora_fin: session.hora_fin,
          num_estudiantes: numEstudiantes,
          docente: docente || '',
          aula: aulaSession || '',
          docente_metadata: {
            titulo_pregrado,
            titulo_posgrado,
            email,
            tipo: tipoDocenteFinal
          }
        });
      }
    }
  }

  // POST-VALIDACION: detectar problemas en los datos extraidos
  if (clases.length > 0) {
    // Check 1: materias numericas (no deberian existir despues del filtro, pero por si acaso)
    const numericMaterias = clases.filter(c => c.materia && /^\d{1,4}$/.test(c.materia.trim()));
    if (numericMaterias.length > 0) {
      const pct = ((numericMaterias.length / clases.length) * 100).toFixed(0);
      console.warn(`[ExcelParser] ⚠️ ALERTA: ${numericMaterias.length}/${clases.length} clases (${pct}%) tienen materia numérica.`);
    }

    // Check 2: docentes vacios o todos iguales
    const docentes = new Set(clases.map(c => c.docente).filter(Boolean));
    if (docentes.size <= 1 && clases.length > 3) {
      console.warn(`[ExcelParser] ⚠️ ALERTA: Solo ${docentes.size} docente(s) distintos en ${clases.length} clases: [${[...docentes].join(', ')}]`);
    }

    // Check 3: materias unicas vs total (si hay pocas unicas, probablemente datos repetidos)
    const materias = new Set(clases.map(c => c.materia));
    console.log(`[ExcelParser]   Resumen: ${clases.length} clases, ${materias.size} materias unicas, ${docentes.size} docentes unicos`);

    // Log primeras 5 clases para verificacion
    console.log(`[ExcelParser]   Primeras 5 clases extraidas:`);
    clases.slice(0, 5).forEach((c, i) => {
      console.log(`[ExcelParser]     [${i}] materia="${c.materia}" docente="${c.docente}" ciclo="${c.ciclo}" paralelo="${c.paralelo}" dia="${c.dia}" hora="${c.hora_inicio}-${c.hora_fin}" est=${c.num_estudiantes} aula="${c.aula}"`);
    });
  }

  return clases;
}

/**
 * Parsea horarios en multiples formatos y retorna sesiones individuales
 * Soporta:
 *   - Columnas separadas dia/hora: "Lunes", "08:00 - 10:00"
 *   - Dia multi-linea: "Lunes\r\nJueves" con hora "08:00 - 10:00\r\n10:00 - 12:00"
 *   - Horario combinado: "LUNES: 08H00 - 10H00\r\nMIERCOLES: 08H00 - 10H00"
 *   - Formato H: "08H00 - 10H00"
 */
function parseSchedule(diaRaw, horaRaw, horaInicioRaw, horaFinRaw) {
  const sessions = [];

  // Caso 1: hora_inicio y hora_fin separados
  if (horaInicioRaw && horaFinRaw) {
    // Verificar si hay multiples dias separados por espacios
    const diasPorEspacios = splitMultiline(diaRaw, true);
    const inicios = splitMultiline(horaInicioRaw);
    const fines = splitMultiline(horaFinRaw);

    // Si hay múltiples días por espacios pero un solo horario
    if (diasPorEspacios.length > 1 && inicios.length === 1 && fines.length === 1) {
      const horaParsed = parseHoraRange(`${inicios[0]} - ${fines[0]}`);
      if (horaParsed) {
        for (const dia of diasPorEspacios) {
          sessions.push({
            dia: normalizeDia(dia),
            hora_inicio: horaParsed.inicio,
            hora_fin: horaParsed.fin
          });
        }
        return sessions;
      }
    }

    const dias = splitMultiline(diaRaw);

    for (let i = 0; i < Math.max(dias.length, inicios.length); i++) {
      sessions.push({
        dia: normalizeDia(dias[i] || dias[0] || ''),
        hora_inicio: normalizeHora(inicios[i] || inicios[0] || ''),
        hora_fin: normalizeHora(fines[i] || fines[0] || '')
      });
    }
    return sessions;
  }

  // Caso 2: hora combinada tipo "LUNES: 08H00 - 10H00\r\nMIERCOLES: 08H00 - 10H00"
  if (horaRaw && /[a-záéíóú]+\s*:/i.test(horaRaw)) {
    const lines = splitMultiline(horaRaw);
    for (const line of lines) {
      const match = line.match(/^([a-záéíóúñ]+)\s*:\s*(.+)/i);
      if (match) {
        const dia = match[1].trim();
        const horaPart = match[2].trim();
        const horaParsed = parseHoraRange(horaPart);
        if (horaParsed) {
          sessions.push({
            dia: normalizeDia(dia),
            hora_inicio: horaParsed.inicio,
            hora_fin: horaParsed.fin
          });
        }
      }
    }
    if (sessions.length > 0) return sessions;
  }

  // Caso 3: dia y hora separados, pueden ser multi-linea
  if (diaRaw && horaRaw) {
    // Primero verificar si hay multiples dias separados por espacios (ej: "LUNES MIÉRCOLES")
    // Esto es diferente de multi-linea, necesitamos dividir por espacios en blanco
    const diasPorEspacios = splitMultiline(diaRaw, true);
    const horas = splitMultiline(horaRaw);

    // Si tenemos mas de un dia separado por espacios, crear una sesion por cada dia
    if (diasPorEspacios.length > 1 && horas.length === 1) {
      // Un solo rango de hora para múltiples días (ej: "LUNES MIÉRCOLES" con "14:00 - 18:00")
      const horaParsed = parseHoraRange(horas[0]);
      if (horaParsed) {
        for (const dia of diasPorEspacios) {
          sessions.push({
            dia: normalizeDia(dia),
            hora_inicio: horaParsed.inicio,
            hora_fin: horaParsed.fin
          });
        }
        return sessions;
      }
    }

    const dias = splitMultiline(diaRaw);

    for (let i = 0; i < Math.max(dias.length, horas.length); i++) {
      const dia = dias[i] || dias[0] || '';
      const hora = horas[i] || horas[0] || '';
      const horaParsed = parseHoraRange(hora);
      if (horaParsed) {
        sessions.push({
          dia: normalizeDia(dia),
          hora_inicio: horaParsed.inicio,
          hora_fin: horaParsed.fin
        });
      }
    }
    return sessions;
  }

  // Caso 4: solo dia
  if (diaRaw && !horaRaw) {
    const dias = splitMultiline(diaRaw);
    for (const dia of dias) {
      if (dia.trim()) {
        sessions.push({
          dia: normalizeDia(dia),
          hora_inicio: '',
          hora_fin: ''
        });
      }
    }
    return sessions;
  }

  return sessions;
}

/**
 * Parsea un rango de hora como "08:00 - 10:00" o "08H00 - 10H00"
 */
function parseHoraRange(text) {
  if (!text) return null;
  const clean = String(text).trim();

  // Formato: "08:00 - 10:00", "08:00-10:00", "08H00 - 10H00"
  const match = clean.match(/(\d{1,2})[:\-hH](\d{2})\s*[-–a]\s*(\d{1,2})[:\-hH](\d{2})/);
  if (match) {
    return {
      inicio: `${match[1].padStart(2, '0')}:${match[2]}`,
      fin: `${match[3].padStart(2, '0')}:${match[4]}`
    };
  }

  // Formato: "10:00 - 13:00" (ya con :)
  const match2 = clean.match(/(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2})/);
  if (match2) {
    return {
      inicio: normalizeHora(match2[1]),
      fin: normalizeHora(match2[2])
    };
  }

  return null;
}

/**
 * Normaliza hora: "08H00" -> "08:00", "8:00" -> "08:00"
 */
function normalizeHora(text) {
  if (!text) return '';
  let clean = String(text).trim().toUpperCase();
  // Reemplazar H por :
  clean = clean.replace(/H/g, ':');
  // Limpiar doble :
  clean = clean.replace(/::/g, ':');
  // Asegurar formato HH:MM
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean;
}

/**
 * Normaliza dia de la semana
 * Tambien maneja valores con multiples dias como "LUNES MIÉRCOLES"
 */
function normalizeDia(text) {
  if (!text) return '';
  const originalText = String(text).trim();
  const dia = normalize(text).trim();

  const mapping = {
    'lunes': 'Lunes', 'lun': 'Lunes',
    'martes': 'Martes', 'mar': 'Martes',
    'miercoles': 'Miercoles', 'mie': 'Miercoles',
    'jueves': 'Jueves', 'jue': 'Jueves',
    'viernes': 'Viernes', 'vie': 'Viernes',
    'sabado': 'Sabado', 'sab': 'Sabado',
    'domingo': 'Domingo', 'dom': 'Domingo',
  };

  // Verificar si hay multiples dias separados por espacios
  // Primero intentamos encontrar todos los nombres de dias en el texto
  const diasEncontrados = [];
  const textoLower = dia.toLowerCase();

  // Buscar nombres de dias completos o abreviados
  const patronesDia = [
    { key: 'lunes', value: 'Lunes' },
    { key: 'martes', value: 'Martes' },
    { key: 'miercoles', value: 'Miercoles' },
    { key: 'jueves', value: 'Jueves' },
    { key: 'viernes', value: 'Viernes' },
    { key: 'sabado', value: 'Sabado' },
    { key: 'domingo', value: 'Domingo' }
  ];

  for (const patron of patronesDia) {
    if (textoLower.includes(patron.key)) {
      diasEncontrados.push(patron.value);
    }
  }

  // Si encontramos multiples dias, devolverlos separados por coma
  if (diasEncontrados.length > 1) {
    return diasEncontrados.join(', ');
  }

  // Si hay un solo dia o no se encontro ninguno, usar el mapeo o devolver el texto original
  return mapping[dia] || originalText;
}

/**
 * Parsea el campo NIVEL/CICLO que puede venir en formatos combinados:
 *   "1A" → ciclo=1, paralelo=A
 *   "1B" → ciclo=1, paralelo=B
 *   "3ro" → ciclo=3
 *   "4to" → ciclo=4
 *   "5"   → ciclo=5
 * Tambien valida que el valor sea un ciclo real y no texto de pie de pagina
 */
function parseCicloParalelo(rawCiclo, existingParalelo) {
  if (!rawCiclo) return { ciclo: '', paralelo: existingParalelo || '' };
  const trimmed = String(rawCiclo).trim();

  // "1A", "2B", "1a" → ciclo=1, paralelo=A
  const matchNP = trimmed.match(/^(\d{1,2})([A-Za-z])$/);
  if (matchNP && matchNP[2].length === 1 && /^[A-Ea-e]$/.test(matchNP[2])) {
    return { ciclo: matchNP[1], paralelo: matchNP[2].toUpperCase() };
  }

  // "3ro", "4to", "5to", "1ero", "2do", "8vo", etc.
  const matchOrd = trimmed.match(/^(\d{1,2})\s*(ro|do|er|ero|to|vo|no|mo)$/i);
  if (matchOrd) {
    return { ciclo: matchOrd[1], paralelo: existingParalelo || '' };
  }

  // Plain number: "1", "2", "10"
  if (/^\d{1,2}$/.test(trimmed)) {
    return { ciclo: trimmed, paralelo: existingParalelo || '' };
  }

  // Si es texto largo (mas de 10 chars) o contiene palabras sospechosas, es invalido
  const norm = normalize(trimmed);
  const SUSPICIOUS_WORDS = [
    'revisado', 'aprobado', 'elaborado', 'cargo', 'firma',
    'director', 'coordinador', 'nota', 'observacion', 'ajuste',
  ];
  if (trimmed.length > 10 || SUSPICIOUS_WORDS.some(w => norm.includes(w))) {
    return { ciclo: '', paralelo: existingParalelo || '', suspicious: true };
  }

  // Otros valores cortos (ej: "I", "II", "III" romanos)
  return { ciclo: trimmed, paralelo: existingParalelo || '' };
}

/**
 * Divide texto multi-linea o valores con multiples dias/horas separados por espacios
 */
function splitMultiline(text, splitBySpaces = false) {
  if (!text) return [];
  const str = String(text);

  // Si splitBySpaces es true, dividir por cualquier cantidad de espacios en blanco
  // Esto es necesario cuando hay valores como "LUNES   MIÉRCOLES" en una celda
  if (splitBySpaces) {
    return str.split(/\s+/).map(l => l.trim()).filter(l => l.length > 0);
  }

  // Por defecto, solo dividir por saltos de linea
  return str.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

/**
 * Obtiene string de una fila en la posicion indicada
 */
function getString(row, colIdx) {
  if (colIdx === undefined || colIdx === null) return '';
  const val = row[colIdx];
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Obtiene numero de una fila en la posicion indicada
 */
function getNumber(row, colIdx) {
  if (colIdx === undefined || colIdx === null) return 0;
  const val = row[colIdx];
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Math.floor(val);
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Deduplica clases basandose en materia + docente + paralelo + ciclo + dia + hora_inicio.
 * Incluye dia y hora_inicio en la clave para preservar sesiones multiples
 * (ej: misma materia en Lunes y Miercoles son entradas diferentes).
 * Cuando hay duplicados, prioriza hojas con nombre "PLANIFICACION".
 * Ademas, entre duplicados elige el que tenga mas datos completos.
 */
function deduplicateClasses(clases) {
  if (clases.length === 0) return clases;

  const uniqueMap = new Map();
  let dupsRemoved = 0;

  for (const clase of clases) {
    // Clave Compuesta: materia + docente + paralelo + ciclo + dia + hora_inicio
    // dia y hora_inicio incluidos para preservar sesiones distintas de la misma materia
    const key = [
      normalize(clase.materia || ''),
      normalize(clase.docente || ''),
      normalize(clase.paralelo || ''),
      normalize(clase.ciclo || ''),
      normalize(clase.dia || ''),
      normalize(clase.hora_inicio || '')
    ].join('|');

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, clase);
    } else {
      dupsRemoved++;
      const existing = uniqueMap.get(key);

      // LÓGICA DE PRIORIDAD (Inspirada en tu solución n8n)
      const isNewPriority = clase._hoja && normalize(clase._hoja).includes('planificacion');
      const isExistingPriority = existing._hoja && normalize(existing._hoja).includes('planificacion');

      // Si la nueva es de PLANIFICACIÓN y la vieja no, reemplazamos
      if (isNewPriority && !isExistingPriority) {
        uniqueMap.set(key, clase);
      }
      // Si ambas son igual de prioritarias, nos quedamos con la que tenga más info (ej. horario)
      else if (isNewPriority === isExistingPriority) {
        const scoreNew = (clase.dia ? 1 : 0) + (clase.hora_inicio ? 1 : 0) + (clase.aula ? 1 : 0);
        const scoreExisting = (existing.dia ? 1 : 0) + (existing.hora_inicio ? 1 : 0) + (existing.aula ? 1 : 0);
        if (scoreNew > scoreExisting) {
          uniqueMap.set(key, clase);
        }
      }
    }
  }

  const result = Array.from(uniqueMap.values());

  // Limpiar campo interno _hoja
  for (const c of result) { delete c._hoja; }

  if (dupsRemoved > 0) {
    console.log(`[ExcelParser] Deduplicacion: ${clases.length} -> ${result.length} (${dupsRemoved} duplicados eliminados)`);
  }

  return result;
}

module.exports = { processExcel };
