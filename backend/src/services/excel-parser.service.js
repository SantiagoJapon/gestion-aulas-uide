// ============================================
// SERVICIO: Parser Inteligente de Excel
// Maneja multiples hojas, celdas fusionadas,
// valores multi-linea y deteccion dinamica de columnas
// ============================================

const XLSX = require('xlsx');

// Palabras clave para detectar columnas (normalizadas, sin acentos)
// Mas especificas primero para evitar falsos positivos
const COLUMN_KEYWORDS = {
  materia: ['materia', 'asignatura', 'nombre materia', 'nombre de la materia', 'curso'],
  docente: ['docente', 'nombre docente', 'nombre del docente', 'profesor', 'teacher', 'instructor'],
  titulo_pregrado: ['titulo pregrado', 'pregrado', 'título pregrado'],
  titulo_posgrado: ['titulo posgrado', 'posgrado', 'postgrado', 'título posgrado'],
  email: ['email', 'correo electro', 'correo', 'mail'],
  tipo_docente: ['tiempo completo', 'tiempo parcial', 'tipo docente', 'dedicacion'],
  dia: ['dia de clase', 'dia clase', 'horario dia', 'dia horario', 'dia'],
  hora: ['hora clase', 'horario hora', 'hora'],
  hora_inicio: ['hora_inicio', 'hora inicio', 'inicio'],
  hora_fin: ['hora_fin', 'hora fin', 'fin'],
  estudiantes: [
    '# estudiantes', 'nro. estudiantes', 'nro estudiantes', 'num estudiantes',
    'numero estudiantes', 'numero de estudiantes', 'cantidad estudiantes',
    'nro. alumnos', 'nro alumnos', 'num alumnos', '# alumnos',
    'numero alumnos', 'numero de alumnos', 'cantidad alumnos',
    'estudiantes', 'alumnos'
  ],
  paralelo: ['paralelo', 'grupo', 'seccion'],
  ciclo: ['ciclo', 'nivel', 'semestre'],
  codigo: ['codigo de la materia', 'codigo materia', 'cod materia', 'codigo', 'cod'],
  aula: ['aula/lab', 'aula / lab', 'aula nro', 'aula', 'salon', 'lab'],
  malla: ['malla'],
  horas_materia: ['horas materia', 'nro. horas', 'nro horas', '# de horas', 'total horas'],
};

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
    .replace(/\s+/g, ' ');
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
    return { clases: [], hojaUsada: 'ninguna', totalHojas: sheetNames.length, debug: { sheetNames } };
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

    const diaPercent = withDia / total;
    const horaPercent = withHora / total;
    const docentePercent = withDocente / total;
    const estudiantesPercent = withEstudiantes / total;

    const clasesCompletas = clases.filter(c =>
      c.dia && c.hora_inicio && (c.docente || c.num_estudiantes > 0)
    ).length;

    const qualityMultiplier = (diaPercent * 0.3) + (horaPercent * 0.3) + (docentePercent * 0.2) + (estudiantesPercent * 0.2);
    result.qualityScore = clasesCompletas + (total * qualityMultiplier * 0.5);

    console.log(`[ExcelParser]   Score "${result.hojaUsada}": ${result.qualityScore.toFixed(1)} (clases=${total}, completas=${clasesCompletas}, dia=${(diaPercent * 100).toFixed(0)}%, hora=${(horaPercent * 100).toFixed(0)}%)`);
  }

  // Determinar si las hojas tienen estructura similar (mismas columnas detectadas)
  // Si es asi, combinar todas las hojas en lugar de elegir solo una
  const sheetsWithData = resultsBySheet.filter(r => r.qualityScore > 0);

  if (sheetsWithData.length > 1) {
    // Verificar si las hojas comparten estructura (al menos 3 columnas en comun)
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

  // Si las hojas no son compatibles, elegir la mejor por score
  sheetsWithData.sort((a, b) => b.qualityScore - a.qualityScore);
  const best = sheetsWithData[0];

  console.log(`[ExcelParser] Mejor hoja: "${best.hojaUsada}" con ${best.clases.length} clases (score=${best.qualityScore.toFixed(1)})`);

  return {
    clases: best.clases,
    hojaUsada: best.hojaUsada,
    totalHojas: sheetNames.length,
    allSheetResults: resultsBySheet.map(r => ({ hoja: r.hojaUsada, clases: r.clases.length })),
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

  const { headerRowIndex, columnMap } = headerInfo;

  console.log(`[ExcelParser]   Header en fila ${headerRowIndex}: ${JSON.stringify(columnMap)}`);

  // Paso 3: Extraer clases desde la fila despues del header
  // A veces hay una sub-header (PREGRADO/POSGRADO), detectar y saltar
  let dataStartRow = headerRowIndex + 1;
  if (dataStartRow < rawData.length) {
    const nextRow = rawData[dataStartRow];
    const nextRowText = nextRow.map(c => normalize(String(c))).join(' ');
    if (nextRowText.includes('pregrado') || nextRowText.includes('posgrado') ||
      nextRowText.includes('componente') || nextRowText.includes('teorica')) {
      dataStartRow++;
    }
  }

  const clases = extractClasses(rawData, dataStartRow, columnMap);

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
 * Encuentra la fila de encabezados buscando palabras clave
 * Soporta headers de 2 filas (ej: HORARIO en fila 3, DIA/HORA en fila 4)
 * Retorna { headerRowIndex, columnMap }
 */
function findHeaderRow(data) {
  // Buscar en las primeras 15 filas
  const searchRange = Math.min(data.length, 15);

  let bestScore = 0;
  let bestRow = -1;
  let bestMap = null;

  for (let rowIdx = 0; rowIdx < searchRange; rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;

    const map = {};
    let score = 0;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellNorm = normalize(String(row[colIdx]));
      if (!cellNorm || cellNorm.length === 0) continue;

      // Buscar match con cada tipo de columna
      for (const [key, keywords] of Object.entries(COLUMN_KEYWORDS)) {
        if (map[key] !== undefined) continue; // ya encontrada

        for (const kw of keywords) {
          if (cellNorm.includes(kw) || cellNorm === kw) {
            map[key] = colIdx;
            score++;
            break;
          }
        }
      }
    }

    // Verificar si la siguiente fila es una sub-header (DIA, HORA, PREGRADO, etc.)
    // y mejorar el mapa con esas columnas adicionales
    // Sub-headers REEMPLAZAN detecciones del parent (ej: HORARIO -> DIA + HORA)
    if (rowIdx + 1 < searchRange) {
      const nextRow = data[rowIdx + 1];
      if (nextRow && nextRow.length > 0) {
        // Primero verificar si parece un sub-header (tiene DIA y/o HORA)
        let hasSubHeader = false;
        const isDiaKw = (s) => COLUMN_KEYWORDS.dia.some(kw => s.includes(kw) || s === kw);
        const isHoraKw = (s) => COLUMN_KEYWORDS.hora.some(kw => s.includes(kw) || s === kw);
        for (let colIdx = 0; colIdx < nextRow.length; colIdx++) {
          const cellNorm = normalize(String(nextRow[colIdx]));
          if (isDiaKw(cellNorm) || isHoraKw(cellNorm)) {
            hasSubHeader = true;
            break;
          }
        }

        if (hasSubHeader) {
          // Si hay sub-header, eliminar detecciones del parent que seran reemplazadas
          // porque probablemente son headers de grupo (HORARIO -> DIA + HORA)
          if (map.hora !== undefined) {
            delete map.hora;
            score--;
          }
          if (map.dia !== undefined) {
            delete map.dia;
            score--;
          }

          for (let colIdx = 0; colIdx < nextRow.length; colIdx++) {
            const cellNorm = normalize(String(nextRow[colIdx]));
            if (!cellNorm || cellNorm.length === 0) continue;

            if (isDiaKw(cellNorm) && map.dia === undefined) {
              map.dia = colIdx;
              score++;
            } else if (isHoraKw(cellNorm) && map.hora === undefined) {
              map.hora = colIdx;
              score++;
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
    }

    // Caso especial: si no hay "materia" pero hay "hora" como header en una grilla de horarios
    // (hojas como "1er", "2do" etc. del TICs) - ignorar esas hojas
  }

  if (bestRow === -1 || !bestMap) {
    return null;
  }

  return { headerRowIndex: bestRow, columnMap: bestMap };
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

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Extraer valores
    const materia = getString(row, columnMap.materia);
    let docente = getString(row, columnMap.docente);
    let ciclo = getString(row, columnMap.ciclo);
    let paralelo = getString(row, columnMap.paralelo);
    let malla = getString(row, columnMap.malla);
    let codigo = getString(row, columnMap.codigo);
    const aula = getString(row, columnMap.aula);

    // Metadatos de docente
    const titulo_pregrado = getString(row, columnMap.titulo_pregrado);
    const titulo_posgrado = getString(row, columnMap.titulo_posgrado);
    const email = getString(row, columnMap.email);
    const tipo_docente = getString(row, columnMap.tipo_docente);

    // Estudiantes - puede ser numero o texto
    let numEstudiantes = getNumber(row, columnMap.estudiantes);

    // Horario - extraer valores raw para parseSchedule
    const diaRaw = getString(row, columnMap.dia);
    const horaRaw = getString(row, columnMap.hora);
    const horaInicioRaw = getString(row, columnMap.hora_inicio);
    const horaFinRaw = getString(row, columnMap.hora_fin);

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

    // LISTA NEGRA: Evitar extraer filas que no son clases
    const MATERIA_BLACK_LIST = [
      'subtotal', 'total', 'receso', 'almuerzo', 'tutor_a', 'atenci_n a estudiantes',
      'gesti_n acad_mica', 'investigaci_n', 'vinculaci_n', 'consejer_a', 'tutor_a',
      'pregrado', 'posgrado', 'horario', 'malla', 'docente', 'materia'
    ];

    let materiaFinal = materia;
    if (!materiaFinal) {
      materiaFinal = lastMateria;
      if (!numEstudiantes && clases.length > 0) numEstudiantes = clases[clases.length - 1].num_estudiantes;
      if (!codigo) codigo = lastCodigo;
    }

    if (!materiaFinal) continue;

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
        aula: aula || '',
        docente_metadata: {
          titulo_pregrado,
          titulo_posgrado,
          email,
          tipo: tipo_docente
        }
      });
    } else {
      // Crear una entrada por cada sesion
      for (const session of sessions) {
        // Manejar aula multi-linea (LAB 2\r\nLAB 1 -> asignar cada aula a cada sesion)
        let aulaSession = aula;
        if (aula && aula.includes('\n')) {
          const aulas = aula.split(/\r?\n/).map(a => a.trim()).filter(a => a);
          const sessionIdx = sessions.indexOf(session);
          aulaSession = aulas[sessionIdx] || aulas[0] || aula;
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
            tipo: tipo_docente
          }
        });
      }
    }
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
    const dias = splitMultiline(diaRaw);
    const inicios = splitMultiline(horaInicioRaw);
    const fines = splitMultiline(horaFinRaw);

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
    const dias = splitMultiline(diaRaw);
    const horas = splitMultiline(horaRaw);

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
 */
function normalizeDia(text) {
  if (!text) return '';
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
  return mapping[dia] || text.trim();
}

/**
 * Divide texto multi-linea
 */
function splitMultiline(text) {
  if (!text) return [];
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
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
 * Deduplica clases basandose en materia + docente + paralelo + ciclo.
 * Cuando hay duplicados, prioriza hojas con nombre "PLANIFICACION".
 * Ademas, entre duplicados elige el que tenga mas datos completos.
 */
function deduplicateClasses(clases) {
  if (clases.length === 0) return clases;

  // Hojas prioritarias (normalizado)
  const PRIORITY_SHEETS = ['planificacion'];

  const uniqueMap = new Map();
  let dupsRemoved = 0;

  for (const clase of clases) {
    // Clave Compuesta (ADN de la clase): materia + docente + paralelo + ciclo
    const key = [
      normalize(clase.materia || ''),
      normalize(clase.docente || ''),
      normalize(clase.paralelo || ''),
      normalize(clase.ciclo || '')
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
