const { Estudiante, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const XLSX = require('xlsx');

/**
 * @desc    Buscar estudiante por email institucional
 * @route   GET /api/estudiantes/lookup?email=
 * @access  Public
 */
const lookupEstudianteByEmail = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'El email es obligatorio'
      });
    }

    if (!email.endsWith('@uide.edu.ec')) {
      return res.status(400).json({
        success: false,
        error: 'Debe usar el correo institucional (@uide.edu.ec)'
      });
    }

    const estudiante = await Estudiante.findOne({
      where: { email }
    });

    if (!estudiante) {
      return res.json({
        success: true,
        found: false
      });
    }

    return res.json({
      success: true,
      found: true,
      estudiante: {
        cedula: estudiante.cedula,
        nombre: estudiante.nombre,
        escuela: estudiante.escuela,
        nivel: estudiante.nivel,
        email: estudiante.email,
        edad: estudiante.edad
      }
    });
  } catch (error) {
    console.error('Error en lookupEstudianteByEmail:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * @desc    Login estudiante por cedula (carga datos + materias)
 * @route   GET /api/estudiantes/login/:cedula
 * @access  Public
 */
const loginEstudianteByCedula = async (req, res) => {
  try {
    const { cedula } = req.params;

    if (!cedula || cedula.length !== 10) {
      return res.status(400).json({
        success: false,
        mensaje: 'Cédula inválida (debe tener 10 dígitos)'
      });
    }

    const estudiante = await Estudiante.findOne({
      where: { cedula }
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        mensaje: 'Estudiante no encontrado'
      });
    }

    // TODO: Cuando exista la tabla estudiantes_materias, agregar consulta de materias
    const materias = [];

    res.json({
      success: true,
      estudiante: {
        id: estudiante.id,
        cedula: estudiante.cedula,
        nombre: estudiante.nombre,
        escuela: estudiante.escuela,
        nivel: estudiante.nivel,
        email: estudiante.email,
        edad: estudiante.edad,
        materias
      }
    });
  } catch (error) {
    console.error('Error en loginEstudianteByCedula:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al buscar estudiante',
      error: error.message
    });
  }
};

/**
 * Validar cédula ecuatoriana con algoritmo oficial
 */
function validarCedulaEcuatoriana(cedula) {
  if (!cedula || cedula.length !== 10) return false;

  const digitos = cedula.split('').map(Number);
  const provincia = parseInt(cedula.substring(0, 2));

  if (provincia < 1 || provincia > 24) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = digitos[i] * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const verificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return verificador === digitos[9];
}

/**
 * @desc    Subir listado de estudiantes desde Excel (PROCESAMIENTO DIRECTO)
 * @route   POST /api/estudiantes/subir
 * @access  Private (admin)
 */
const subirEstudiantes = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'No se recibió ningún archivo'
      });
    }

    console.log('📁 Archivo recibido:', req.file.originalname);
    console.log('📊 Tamaño:', (req.file.size / 1024).toFixed(2), 'KB');

    // Leer el archivo Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    console.log('📄 Hojas disponibles:', workbook.SheetNames.join(', '));

    // Usar la primera hoja disponible para estudiantes
    if (workbook.SheetNames.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: 'El archivo Excel no contiene hojas válidas'
      });
    }

    // Usar la primera hoja como "Sheet1" (estudiantes)
    const primeraHoja = workbook.SheetNames[0];
    const sheet1 = workbook.Sheets[primeraHoja];
    const estudiantesData = XLSX.utils.sheet_to_json(sheet1);

    console.log(`📚 Leyendo hoja "${primeraHoja}": ${estudiantesData.length} filas`);

    // Validar que la primera hoja tenga datos
    if (estudiantesData.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        mensaje: `La hoja "${primeraHoja}" no contiene datos`
      });
    }

    // Leer segunda hoja para inscripciones (opcional)
    let materiasData = [];
    if (workbook.SheetNames.length > 1) {
      const segundaHoja = workbook.SheetNames[1];
      const sheet2 = workbook.Sheets[segundaHoja];
      materiasData = XLSX.utils.sheet_to_json(sheet2);
      console.log(`📖 Leyendo hoja "${segundaHoja}": ${materiasData.length} inscripciones`);
    } else {
      console.log('ℹ️  No se encontró segunda hoja (inscripciones opcionales)');
    }

    // Variable para mapeo de columnas (inicializar fuera de bloques condicionales)
    let columnMap = { cedulaCol: 'cedula', nombresCol: 'nombres', apellidosCol: 'apellidos' };
    let usandoDeteccionAutomatica = false;

    // Validar que la primera fila tenga columnas
    if (estudiantesData.length > 0) {
      const primeraFila = estudiantesData[0];
      const columnasDetectadas = Object.keys(primeraFila).filter(k => !k.startsWith('__EMPTY'));

      console.log('📋 Columnas detectadas:', columnasDetectadas.join(', '));

      // Si tiene columnas vacías, buscar si hay encabezados en una fila posterior
      if (columnasDetectadas.length === 0 || columnasDetectadas.some(c => c.includes('__EMPTY'))) {
        console.log('⚠️  Excel tiene formato no estándar, intentando detectar encabezados...');
        console.log('🔍 Buscando encabezados en las primeras 15 filas...');

        // Buscar en las primeras 15 filas
        let filaEncabezados = -1;
        let encabezadosEncontrados = {};

        for (let i = 0; i < Math.min(15, estudiantesData.length); i++) {
          const fila = estudiantesData[i];
          const valoresFila = Object.values(fila).filter(v => v !== null && v !== undefined);

          console.log(`   Fila ${i + 1}: ${valoresFila.slice(0, 5).map(v => String(v).substring(0, 20)).join(' | ')}`);

          // Si encontramos "cedula" o "nombres" en los valores, esta es la fila de encabezados
          const tieneCedula = valoresFila.some(v =>
            typeof v === 'string' &&
            (v.toLowerCase().includes('cedula') || v.toLowerCase().includes('cédula') || v.toLowerCase() === 'ci')
          );

          const tieneNombres = valoresFila.some(v =>
            typeof v === 'string' &&
            v.toLowerCase().includes('nombre')
          );

          const tieneApellidos = valoresFila.some(v =>
            typeof v === 'string' &&
            v.toLowerCase().includes('apellido')
          );

          const tieneNombreCompleto = valoresFila.some(v =>
            typeof v === 'string' &&
            (v.toLowerCase().includes('nombre completo') ||
              v.toLowerCase().includes('nombre_completo') ||
              v.toLowerCase().includes('full name'))
          );

          if (tieneCedula || tieneNombreCompleto || (tieneNombres && tieneApellidos)) {
            console.log(`   ✅ Posible fila de encabezados detectada en fila ${i + 1}`);
            filaEncabezados = i;

            // Mapear encabezados desde los valores de esta fila
            const keys = Object.keys(fila);
            keys.forEach(key => {
              const valor = String(fila[key] || '').toLowerCase().trim();

              // Eliminar acentos para comparación más flexible
              const sinAcentos = valor
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/ñ/g, 'n');

              if (sinAcentos.includes('cedula') || valor === 'ci' || valor.includes('cédula')) {
                encabezadosEncontrados.cedula = key;
              } else if (valor.includes('nombre completo') || valor.includes('nombre_completo') || valor.includes('full name')) {
                // Nombre completo (nombres y apellidos juntos)
                encabezadosEncontrados.nombreCompleto = key;
                encabezadosEncontrados.nombres = key; // También lo marcamos como nombres
                encabezadosEncontrados.apellidos = key; // Y como apellidos (lo dividiremos luego)
              } else if ((sinAcentos.includes('nombre') || valor.includes('name')) && !sinAcentos.includes('apellido') && !valor.includes('completo')) {
                if (!encabezadosEncontrados.nombreCompleto) {
                  encabezadosEncontrados.nombres = key;
                }
              } else if (sinAcentos.includes('apellido') || valor.includes('surname')) {
                if (!encabezadosEncontrados.nombreCompleto) {
                  encabezadosEncontrados.apellidos = key;
                }
              } else if (valor.includes('email') || valor.includes('correo') || valor.includes('mail')) {
                encabezadosEncontrados.email = key;
              } else if (valor.includes('telefono') || valor.includes('celular') || valor.includes('phone')) {
                encabezadosEncontrados.telefono = key;
              } else if (valor.includes('escuela') || valor.includes('carrera') || valor.includes('facultad')) {
                encabezadosEncontrados.escuela = key;
              } else if (valor.includes('nivel') || valor.includes('semestre') || valor.includes('ciclo')) {
                encabezadosEncontrados.nivel = key;
              }
            });

            console.log(`✅ Encabezados encontrados en fila ${i + 1} (fila Excel: ${i + 1})`);
            console.log(`📋 Mapeo creado:`, JSON.stringify(encabezadosEncontrados, null, 2));

            // Verificar que al menos tenemos cedula, nombres y apellidos
            if (encabezadosEncontrados.cedula && encabezadosEncontrados.nombres && encabezadosEncontrados.apellidos) {
              console.log('✅ Encabezados completos detectados (cedula, nombres, apellidos)');
              break;
            } else {
              console.log('⚠️  Encabezados incompletos, continuando búsqueda...');
              console.log(`   Faltantes: ${!encabezadosEncontrados.cedula ? 'cedula ' : ''}${!encabezadosEncontrados.nombres ? 'nombres ' : ''}${!encabezadosEncontrados.apellidos ? 'apellidos' : ''}`);
              filaEncabezados = -1;
              encabezadosEncontrados = {};
            }
          }
        }

        // Si encontramos encabezados en otra fila, usar desde ahí
        if (filaEncabezados !== -1) {
          const filaExcel = filaEncabezados + 1;
          const filaInicioDatos = filaEncabezados + 2;

          console.log('');
          console.log('🎯 RESULTADO DE DETECCIÓN:');
          console.log(`   📍 Encabezados en: Fila ${filaExcel} (Excel)`);
          console.log(`   📍 Datos inician en: Fila ${filaInicioDatos} (Excel)`);
          console.log(`   🗑️  Saltando: ${filaEncabezados + 1} filas (títulos + encabezados)`);
          console.log('');

          // Eliminar las filas antes de los encabezados (incluyendo la fila de encabezados)
          estudiantesData.splice(0, filaEncabezados + 1);

          console.log(`📊 Filas de datos a procesar: ${estudiantesData.length}`);
          console.log('');

          // Actualizar el mapeo de columnas
          columnMap = {
            cedulaCol: encabezadosEncontrados.cedula,
            nombresCol: encabezadosEncontrados.nombres,
            apellidosCol: encabezadosEncontrados.apellidos,
            nombreCompleto: encabezadosEncontrados.nombreCompleto,
            emailCol: encabezadosEncontrados.email,      // ← Agregar email
            escuelaCol: encabezadosEncontrados.escuela,  // ← Agregar escuela
            nivelCol: encabezadosEncontrados.nivel       // ← Agregar nivel
          };

          // Marcar que usamos detección automática
          usandoDeteccionAutomatica = true;

          console.log('✅ Usando mapeo automático de headers detectados');
        } else {
          // No se encontraron encabezados válidos
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            mensaje: 'No se pudieron detectar los encabezados en las primeras 15 filas del Excel. Asegúrate de que tenga columnas: cedula, nombres, apellidos',
            ayuda: 'El archivo debe tener una fila con encabezados que incluya al menos: cedula, nombres, apellidos. Los encabezados deben estar en las primeras 15 filas.',
            detalles: 'Se buscaron palabras clave como: cedula, nombres, apellidos (y sus variaciones)'
          });
        }
      }

      // Solo verificar columnas manualmente si NO se detectaron headers automáticamente
      if (!usandoDeteccionAutomatica) {
        // Verificar columnas requeridas (buscar variantes comunes)
        const buscarColumna = (nombreBuscado, aliases = []) => {
          const todasOpciones = [nombreBuscado, ...aliases];
          return todasOpciones.find(opt =>
            Object.keys(primeraFila).some(k =>
              k.toLowerCase().trim() === opt.toLowerCase()
            )
          ) || Object.keys(primeraFila).find(k =>
            k.toLowerCase().includes(nombreBuscado.toLowerCase())
          );
        };

        const cedulaCol = buscarColumna('cedula', ['cédula', 'ci', 'identificacion']);
        const nombresCol = buscarColumna('nombres', ['nombre', 'name']);
        const apellidosCol = buscarColumna('apellidos', ['apellido', 'surname']);

        if (!cedulaCol || !nombresCol || !apellidosCol) {
          const faltantes = [];
          if (!cedulaCol) faltantes.push('cedula');
          if (!nombresCol) faltantes.push('nombres');
          if (!apellidosCol) faltantes.push('apellidos');

          await transaction.rollback();
          return res.status(400).json({
            success: false,
            mensaje: `El Excel no tiene las columnas requeridas. Faltan: ${faltantes.join(', ')}`,
            columnasDetectadas: Object.keys(primeraFila).filter(k => !k.startsWith('__EMPTY')),
            columnasRequeridas: ['cedula', 'nombres', 'apellidos'],
            ayuda: 'Asegúrate de que la primera fila del Excel tenga exactamente estos nombres: cedula, nombres, apellidos'
          });
        }

        console.log(`✅ Columnas mapeadas: cedula="${cedulaCol}", nombres="${nombresCol}", apellidos="${apellidosCol}"`);

        // Actualizar mapeo con columnas detectadas
        columnMap = { cedulaCol, nombresCol, apellidosCol };
      }
    }

    // Contadores
    let estudiantesGuardados = 0;
    let estudiantesActualizados = 0;
    let inscripcionesGuardadas = 0;
    let errores = [];

    // ========================================
    // PASO 1: PROCESAR ESTUDIANTES
    // ========================================
    console.log('👥 Procesando estudiantes...');
    console.log(`📊 Total de filas a procesar: ${estudiantesData.length}`);

    for (let i = 0; i < estudiantesData.length; i++) {
      const row = estudiantesData[i];

      try {
        // Obtener valores usando las columnas detectadas
        const cedulaVal = row[columnMap.cedulaCol] || row['Cédula'] || row.cedula;
        let nombresVal = row[columnMap.nombresCol] || row.nombres;
        let apellidosVal = row[columnMap.apellidosCol] || row.apellidos;

        // Saltar filas completamente vacías sin reportar error
        const todasVacias = Object.values(row).every(v => !v || String(v).trim() === '');
        if (todasVacias) {
          continue;
        }

        // Si tenemos "Nombre Completo", dividirlo en nombres y apellidos
        if (columnMap.nombreCompleto && row[columnMap.nombreCompleto]) {
          const nombreCompleto = String(row[columnMap.nombreCompleto]).trim();
          const partes = nombreCompleto.split(' ');

          if (partes.length >= 2) {
            // Asumir que la primera mitad son nombres y la segunda mitad apellidos
            const mitad = Math.ceil(partes.length / 2);
            nombresVal = partes.slice(0, mitad).join(' ');
            apellidosVal = partes.slice(mitad).join(' ');
          } else if (partes.length === 1) {
            nombresVal = partes[0];
            apellidosVal = partes[0];
          }
        }

        // Validar campos requeridos y reportar específicamente qué falta
        const camposFaltantes = [];
        if (!cedulaVal || String(cedulaVal).trim() === '') {
          camposFaltantes.push('cedula');
        }
        if (!nombresVal || String(nombresVal).trim() === '') {
          camposFaltantes.push('nombres');
        }
        if (!apellidosVal || String(apellidosVal).trim() === '') {
          camposFaltantes.push('apellidos');
        }

        if (camposFaltantes.length > 0) {
          errores.push(`Fila ${i + 2}: Faltan campos requeridos: ${camposFaltantes.join(', ')}`);
          console.log(`⚠️  Fila ${i + 2}: Datos incompletos. Faltan: ${camposFaltantes.join(', ')}`);
          continue;
        }

        const cedula = String(cedulaVal).trim();
        const nombres = String(nombresVal).trim();
        const apellidos = String(apellidosVal).trim();

        // Buscar email usando el mapeo si existe, sino buscar en campos posibles
        const emailRaw = columnMap.emailCol
          ? row[columnMap.emailCol]
          : (row['Email UIDE'] || row.email || row['email'] || row.Email);
        const emailFinal = emailRaw ? String(emailRaw).trim() : null;

        const telefono = row.telefono ? String(row.telefono).trim() : null;

        // Buscar nivel usando el mapeo si existe, sino buscar en campos posibles
        const nivelRaw = columnMap.nivelCol
          ? row[columnMap.nivelCol]
          : (row['Nivel Actual'] || row.nivel || row.Nivel || row.semestre || row.Semestre || '1');
        const nivel = String(nivelRaw).trim();

        // Buscar escuela usando el mapeo si existe, sino buscar en campos posibles
        const escuelaRaw = columnMap.escuelaCol
          ? row[columnMap.escuelaCol]
          : (row.Escuela || row.escuela || row.Carrera || row.carrera);
        const escuela = escuelaRaw ? String(escuelaRaw).trim() : 'Sin especificar';

        // Validar formato de cédula
        if (cedula.length !== 10 || !/^\d+$/.test(cedula)) {
          errores.push(`Fila ${i + 2}: Cédula con formato incorrecto (${cedula}) - debe tener 10 dígitos numéricos`);
          console.log(`⚠️  Fila ${i + 2}: Cédula "${cedula}" tiene formato incorrecto`);
          continue;
        }

        // Validar cédula ecuatoriana
        if (!validarCedulaEcuatoriana(cedula)) {
          errores.push(`Fila ${i + 2}: Cédula ecuatoriana inválida (${cedula}) - no cumple algoritmo de verificación`);
          console.log(`⚠️  Fila ${i + 2}: Cédula "${cedula}" no es válida según algoritmo ecuatoriano`);
          continue;
        }

        // Construir nombre completo
        const nombre = `${nombres} ${apellidos}`;

        // Insertar o actualizar estudiante usando raw query
        // NOTA: La tabla estudiantes solo tiene: cedula, nombre, email, nivel, escuela, edad, telegram_id, fecha_registro
        const result = await sequelize.query(
          `INSERT INTO estudiantes 
           (cedula, nombre, email, nivel, escuela)
           VALUES (:cedula, :nombre, :email, :nivel, :escuela)
           ON CONFLICT (cedula) 
           DO UPDATE SET 
             nombre = EXCLUDED.nombre,
             email = EXCLUDED.email,
             nivel = EXCLUDED.nivel,
             escuela = EXCLUDED.escuela
           RETURNING (xmax = 0) as inserted`,
          {
            replacements: {
              cedula,
              nombre,
              email: emailFinal,
              nivel,
              escuela
            },
            type: QueryTypes.INSERT,
            transaction
          }
        );

        if (result[0] && result[0][0] && result[0][0].inserted) {
          estudiantesGuardados++;
        } else {
          estudiantesActualizados++;
        }

      } catch (error) {
        errores.push(`Fila ${i + 2}: ${error.message}`);
        console.error(`Error en fila ${i + 2}:`, error);
      }
    }

    console.log(`✅ Estudiantes nuevos: ${estudiantesGuardados}`);
    console.log(`🔄 Estudiantes actualizados: ${estudiantesActualizados}`);
    if (errores.length > 0) {
      console.log(`⚠️  Errores encontrados: ${errores.length}`);
      console.log(`⚠️  Primeros errores:`);
      errores.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    }

    // ========================================
    // PASO 2: PROCESAR INSCRIPCIONES (si existe Sheet2)
    // ========================================
    if (materiasData.length > 0) {
      console.log('📚 Procesando inscripciones...');

      // Verificar si existe la tabla estudiantes_materias
      const tableCheck = await sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'estudiantes_materias'
        )`,
        { type: QueryTypes.SELECT, transaction }
      );

      if (tableCheck[0].exists) {
        for (let i = 0; i < materiasData.length; i++) {
          const row = materiasData[i];

          try {
            // Validar campos requeridos
            if (!row.cedula_estudiante || !row.codigo_materia) {
              errores.push(`Sheet2 Fila ${i + 2}: Faltan campos requeridos`);
              continue;
            }

            const cedula_estudiante = String(row.cedula_estudiante).trim();
            const codigo_materia = String(row.codigo_materia).trim();
            const nivel = row.nivel ? parseInt(row.nivel) : 1;
            const paralelo = row.paralelo ? String(row.paralelo).trim() : 'A';

            // Buscar ID del estudiante
            const estudianteResult = await sequelize.query(
              'SELECT id FROM estudiantes WHERE cedula = :cedula',
              {
                replacements: { cedula: cedula_estudiante },
                type: QueryTypes.SELECT,
                transaction
              }
            );

            if (estudianteResult.length === 0) {
              errores.push(`Sheet2 Fila ${i + 2}: Estudiante no encontrado (${cedula_estudiante})`);
              continue;
            }

            const estudiante_id = estudianteResult[0].id;

            // Buscar ID de la clase (la tabla clases usa 'materia', 'ciclo' y 'paralelo')
            const claseResult = await sequelize.query(
              `SELECT id FROM clases 
               WHERE materia ILIKE :materia 
               AND (ciclo = :ciclo OR ciclo ILIKE :cicloStr)
               AND paralelo = :paralelo
               LIMIT 1`,
              {
                replacements: {
                  materia: `%${codigo_materia}%`,
                  ciclo: nivel.toString(),
                  cicloStr: `%${nivel}%`,
                  paralelo
                },
                type: QueryTypes.SELECT,
                transaction
              }
            );

            if (claseResult.length === 0) {
              errores.push(`Sheet2 Fila ${i + 2}: Clase no encontrada (${codigo_materia} - Ciclo ${nivel} - Paralelo ${paralelo})`);
              continue;
            }

            const clase_id = claseResult[0].id;

            // Insertar inscripción
            await sequelize.query(
              `INSERT INTO estudiantes_materias (estudiante_id, clase_id)
               VALUES (:estudiante_id, :clase_id)
               ON CONFLICT (estudiante_id, clase_id) DO NOTHING`,
              {
                replacements: { estudiante_id, clase_id },
                type: QueryTypes.INSERT,
                transaction
              }
            );

            inscripcionesGuardadas++;

          } catch (error) {
            errores.push(`Sheet2 Fila ${i + 2}: ${error.message}`);
            console.error(`Error en inscripción fila ${i + 2}:`, error);
          }
        }

        console.log(`✅ Inscripciones guardadas: ${inscripcionesGuardadas}`);
      } else {
        console.log('⚠️  Tabla estudiantes_materias no existe, omitiendo inscripciones');
      }
    }

    // ========================================
    // PASO 3: REGISTRAR EN HISTORIAL
    // ========================================
    try {
      await sequelize.query(
        `INSERT INTO historial_cargas 
         (tipo, archivo_nombre, registros_procesados, estado, fecha_carga, detalles, usuario_id)
         VALUES (:tipo, :archivo, :registros, :estado, NOW(), :detalles, :usuario_id)`,
        {
          replacements: {
            tipo: 'estudiantes',
            archivo: req.file.originalname,
            registros: estudiantesGuardados + estudiantesActualizados,
            estado: 'completado', // Siempre 'completado' - errores van en detalles
            detalles: JSON.stringify({
              estudiantes_nuevos: estudiantesGuardados,
              estudiantes_actualizados: estudiantesActualizados,
              inscripciones: inscripcionesGuardadas,
              errores: errores.length > 0 ? errores : null
            }),
            usuario_id: req.usuario?.id || null
          },
          type: QueryTypes.INSERT,
          transaction
        }
      );
    } catch (histError) {
      console.error('Error al registrar historial:', histError);
      // No fallar la operación si el historial falla
    }

    // Confirmar transacción
    await transaction.commit();

    console.log('✅ Proceso completado exitosamente');

    // Generar resumen de errores por tipo
    let resumenErrores = null;
    if (errores.length > 0) {
      const tiposError = {
        campos_faltantes: errores.filter(e => e.includes('Faltan campos')).length,
        cedulas_invalidas: errores.filter(e => e.includes('Cédula') && e.includes('inválida')).length,
        formato_incorrecto: errores.filter(e => e.includes('formato incorrecto')).length,
        estudiantes_no_encontrados: errores.filter(e => e.includes('Estudiante no encontrado')).length,
        clases_no_encontradas: errores.filter(e => e.includes('Clase no encontrada')).length,
        otros: errores.filter(e =>
          !e.includes('Faltan campos') &&
          !e.includes('Cédula') &&
          !e.includes('formato') &&
          !e.includes('no encontrado') &&
          !e.includes('no encontrada')
        ).length
      };

      resumenErrores = {
        total: errores.length,
        por_tipo: tiposError,
        primeros_10: errores.slice(0, 10),
        mensaje: errores.length > 10
          ? `Mostrando los primeros 10 de ${errores.length} errores. Revisa los logs para ver todos.`
          : null
      };
    }

    const mensaje = errores.length === 0
      ? 'Estudiantes procesados exitosamente sin errores'
      : `Proceso completado. ${estudiantesGuardados + estudiantesActualizados} estudiantes procesados con ${errores.length} error(es) detectado(s)`;

    res.json({
      success: true,
      mensaje,
      resultado: {
        estudiantes_nuevos: estudiantesGuardados,
        estudiantes_actualizados: estudiantesActualizados,
        total_estudiantes: estudiantesGuardados + estudiantesActualizados,
        inscripciones_guardadas: inscripcionesGuardadas,
        total_filas_procesadas: estudiantesData.length,
        errores: resumenErrores,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Revertir transacción en caso de error
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Error al hacer rollback:', rollbackError);
    }

    console.error('❌ Error al procesar estudiantes:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);

    // Registrar error en historial
    if (req.file) {
      try {
        await sequelize.query(
          `INSERT INTO historial_cargas 
           (tipo, archivo_nombre, registros_procesados, estado, fecha_carga, detalles, usuario_id)
           VALUES (:tipo, :archivo, 0, 'error', NOW(), :detalles, :usuario_id)`,
          {
            replacements: {
              tipo: 'estudiantes',
              archivo: req.file.originalname,
              detalles: JSON.stringify({
                error: error.message,
                stack: error.stack,
                code: error.code
              }),
              usuario_id: req.usuario?.id || null
            },
            type: QueryTypes.INSERT
          }
        );
      } catch (histError) {
        console.error('Error al registrar error en historial:', histError);
      }
    }

    res.status(500).json({
      success: false,
      mensaje: 'Error al procesar el archivo',
      error: error.message,
      detalles: error.code ? `Código: ${error.code}` : undefined
    });
  }
};

/**
 * @desc    Obtener historial de cargas
 * @route   GET /api/estudiantes/historial-cargas
 * @access  Private (admin)
 */
const obtenerHistorialCargas = async (req, res) => {
  try {
    const { tipo, limite } = req.query;

    let query = 'SELECT * FROM historial_cargas WHERE 1=1';
    const replacements = {};

    if (tipo) {
      query += ` AND tipo = :tipo`;
      replacements.tipo = tipo;
    }

    query += ' ORDER BY fecha_carga DESC';

    const limit = limite ? parseInt(limite) : 20;
    query += ` LIMIT ${limit}`;

    const result = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      historial: result
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  lookupEstudianteByEmail,
  loginEstudianteByCedula,
  subirEstudiantes,
  obtenerHistorialCargas
};
