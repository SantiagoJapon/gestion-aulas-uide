const { Estudiante, sequelize } = require('../models');
const { QueryTypes, Op } = require('sequelize');
const XLSX = require('xlsx');
const { generarToken } = require('../utils/jwt');
const estudianteService = require('../services/estudiante.service');

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

    const estudiante = await estudianteService.lookupByEmail(email);

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

    const estudiante = await estudianteService.findByCedula(cedula);

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        mensaje: 'Estudiante no encontrado'
      });
    }

    // Obtener materias inscritas via service, filtrando por carrera del estudiante
    const materias = await estudianteService.getMateriasByEstudianteId(estudiante.id, estudiante.escuela);

    // Generar JWT para el estudiante
    const token = generarToken({
      id: estudiante.id,
      email: estudiante.email || `est-${estudiante.cedula}@uide.edu.ec`,
      rol: 'estudiante'
    }, '8h');

    const estudianteData = {
      id: estudiante.id,
      cedula: estudiante.cedula,
      nombre: estudiante.nombre,
      escuela: estudiante.escuela,
      nivel: estudiante.nivel,
      email: estudiante.email,
      edad: estudiante.edad,
      materias: materias.map(m => ({
        ...m,
        materia: String(m.materia).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      }))
    };

    res.json({
      success: true,
      token,
      estudiante: estudianteData,
      usuario: {
        id: estudiante.id,
        nombre: estudiante.nombre,
        apellido: '',
        email: estudiante.email || '',
        rol: 'estudiante',
        cedula: estudiante.cedula,
        estado: 'activo',
        escuela: estudiante.escuela,
        nivel: estudiante.nivel
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
 * @desc    Listar estudiantes con filtros y paginación
 * @route   GET /api/estudiantes
 * @access  Private (admin)
 */
const listarEstudiantes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200); // tope razonable
    const offset = (page - 1) * limit;

    const { search, escuela, nivel } = req.query;
    const where = {};

    // Filtro por Rol: Si es director, solo ve su carrera
    if (req.usuario.rol === 'director' && req.usuario.carrera_director) {
      const carreraOriginal = req.usuario.carrera_director.trim();
      const carreraSinAcentos = carreraOriginal.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      where.escuela = {
        [Op.or]: [
          { [Op.iLike]: `%${carreraOriginal}%` },
          { [Op.iLike]: `%${carreraSinAcentos}%` }
        ]
      };
    } else if (escuela && String(escuela).trim() !== '') {
      // Si es admin y pasó un filtro de escuela
      where.escuela = { [Op.iLike]: `%${String(escuela).trim()}%` };
    }

    if (search && String(search).trim() !== '') {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { cedula: { [Op.iLike]: term } },
        { nombre: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
      ];
    }

    if (nivel && String(nivel).trim() !== '') {
      where.nivel = { [Op.iLike]: `%${String(nivel).trim()}%` };
    }

    const { rows, count } = await Estudiante.findAndCountAll({
      where,
      limit,
      offset,
      order: [['nombre', 'ASC']],
    });

    const totalPages = Math.ceil(count / limit) || 1;

    res.json({
      success: true,
      total: count,
      page,
      pages: totalPages,
      estudiantes: rows,
    });
  } catch (error) {
    console.error('Error en listarEstudiantes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al listar estudiantes',
      error: error.message,
    });
  }
};

/**
 * Validar cédula ecuatoriana con algoritmo oficial (vía service)
 */
function validarCedulaEcuatoriana(cedula) {
  return estudianteService.validarCedulaEcuatoriana(cedula);
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
              } else if (valor.includes('escuela') || valor.includes('carrera') || valor.includes('facultad') || valor.includes('programa') || valor.includes('plan de estudio')) {
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
        // IMPORTANTE: devuelve la clave REAL del Excel (con su casing original), no el alias
        const buscarColumna = (nombreBuscado, aliases = []) => {
          const todasOpciones = [nombreBuscado, ...aliases];
          // 1. Coincidencia exacta (case-insensitive) → devuelve la clave real
          const exactKey = Object.keys(primeraFila).find(k =>
            todasOpciones.some(opt => k.toLowerCase().trim() === opt.toLowerCase())
          );
          if (exactKey) return exactKey;
          // 2. Coincidencia parcial → devuelve la clave real
          return Object.keys(primeraFila).find(k =>
            k.toLowerCase().includes(nombreBuscado.toLowerCase())
          ) || null;
        };

        const cedulaCol = buscarColumna('cedula', ['cédula', 'ci', 'identificacion']);
        const nombresCol = buscarColumna('nombres', ['nombre', 'name']);
        const apellidosCol = buscarColumna('apellidos', ['apellido', 'surname']);
        const escuelaColManual = buscarColumna('carrera', ['escuela', 'facultad', 'programa', 'carrera academica', 'carrera académica']);

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

        console.log(`✅ Columnas mapeadas: cedula="${cedulaCol}", nombres="${nombresCol}", apellidos="${apellidosCol}", escuela="${escuelaColManual || 'no detectada'}"`);;

        // Actualizar mapeo con columnas detectadas
        columnMap = { cedulaCol, nombresCol, apellidosCol, escuelaCol: escuelaColManual };
      }
    }

    // Helper: comparación flexible de nombres de carrera (ignora tildes, mayúsculas y espacios extra)
    const normCarrera = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
    const carrerasCoinciden = (a, b) => {
      if (!a || !b) return false;
      const na = normCarrera(a);
      const nb = normCarrera(b);
      return na === nb || na.includes(nb) || nb.includes(na);
    };

    // ========================================
    // PRE-CARGA: Carreras canónicas para normalizar escuela
    // ========================================
    const { Carrera } = require('../models');
    const carrerasCanonics = await Carrera.findAll({ where: { activa: true }, attributes: ['carrera'] });
    const normStr = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
    const stripLocation = (s) => (s || '').replace(/\s*-\s*(?:loja|quito|guayaquil|cuenca|ambato|riobamba)\s*$/i, '').replace(/\s+(?:loja|quito|guayaquil|cuenca|ambato|riobamba)\s*$/i, '').trim();

    // Intenta mapear un nombre de escuela del Excel al nombre canónico de uploads_carreras.
    // Estrategia: quitar sufijo de ciudad, normalizar y ver si uno contiene al otro.
    const normalizarEscuela = (escuelaExcelRaw) => {
      if (!escuelaExcelRaw) return escuelaExcelRaw;
      const stripped = normStr(stripLocation(escuelaExcelRaw));
      if (!stripped) return escuelaExcelRaw;

      let bestMatch = null;
      let bestLen = 0;
      for (const c of carrerasCanonics) {
        const cn = normStr(c.carrera);
        if (!cn) continue;
        // Coincidencia si uno contiene al otro (mínimo 5 chars para evitar falsos positivos)
        const matches = (stripped.includes(cn) || cn.includes(stripped)) && Math.min(stripped.length, cn.length) >= 5;
        if (matches && cn.length > bestLen) {
          bestLen = cn.length;
          bestMatch = c.carrera;
        }
      }
      return bestMatch || escuelaExcelRaw;
    };

    // Contadores
    let estudiantesGuardados = 0;
    let estudiantesActualizados = 0;
    let estudiantesSaltados = 0;
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

        // Detectar escuela en el Excel — búsqueda robusta
        const escuelaRaw = (() => {
          // 1. Columna ya mapeada (más precisa)
          if (columnMap.escuelaCol && row[columnMap.escuelaCol] != null) return row[columnMap.escuelaCol];
          // 2. Buscar en cualquier clave del row que contenga palabras de carrera
          const termsCarrera = ['carrera', 'escuela', 'facultad', 'programa'];
          const carreraKey = Object.keys(row).find(k =>
            termsCarrera.some(t => k.toLowerCase().includes(t))
          );
          return carreraKey ? row[carreraKey] : null;
        })();

        // Lógica de asignación de escuela:
        // - Director: si el Excel tiene columna de carrera, saltar estudiantes de otras carreras.
        //   Si no tiene columna de carrera, asumir todos son de su carrera.
        // - Admin con escuela en body: usar esa escuela para todos.
        // - Admin sin escuela en body: leer del Excel (cada estudiante con su propia carrera).
        const escuelaExcel = escuelaRaw ? String(escuelaRaw).trim() : null;
        let escuela = 'Sin especificar';

        if (req.usuario.rol === 'director' && req.usuario.carrera_director) {
          const directorCarrera = req.usuario.carrera_director;
          if (escuelaExcel) {
            // El Excel tiene columna de carrera: normalizar y filtrar por carrera del director
            const escuelaNorm = normalizarEscuela(escuelaExcel);
            if (!carrerasCoinciden(escuelaNorm, directorCarrera)) {
              estudiantesSaltados++;
              continue; // Saltar estudiante de otra carrera
            }
          }
          // Sin columna de carrera en Excel, o coincide: asignar la carrera canónica del director
          escuela = directorCarrera;
        } else if (req.body.escuela) {
          escuela = String(req.body.escuela).trim();
        } else if (escuelaExcel) {
          // Admin sin escuela en body: normalizar contra carreras canónicas
          escuela = normalizarEscuela(escuelaExcel);
        }

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

        // --- NUEVO: Procesar Materias/Inscripciones desde la misma fila ---
        const materiasRaw = row[columnMap.materiasCol] || row.materias || row.Materias;
        if (materiasRaw) {
          const listaMaterias = String(materiasRaw).split(/[,;|]/).map(m => m.trim()).filter(m => m.length > 0);

          // Obtener ID del estudiante (si acaba de ser insertado/actualizado)
          const [estRecord] = await sequelize.query(
            'SELECT id FROM estudiantes WHERE cedula = :cedula',
            { replacements: { cedula }, type: QueryTypes.SELECT, transaction }
          );

          if (estRecord) {
            for (const materiaNombre of listaMaterias) {
              // Buscar clase que coincida con la materia y el nivel/escuela
              const claseCheck = await sequelize.query(
                `SELECT id FROM clases 
                 WHERE (materia ILIKE :materia OR :materia ILIKE CONCAT('%', materia, '%'))
                 AND (carrera = :escuela OR carrera_id IN (SELECT id FROM uploads_carreras WHERE carrera = :escuela))
                 LIMIT 1`,
                {
                  replacements: {
                    materia: `%${materiaNombre}%`,
                    escuela: escuela
                  },
                  type: QueryTypes.SELECT,
                  transaction
                }
              );

              if (claseCheck.length > 0) {
                await sequelize.query(
                  `INSERT INTO estudiantes_materias (estudiante_id, clase_id, created_at, updated_at)
                   VALUES (:est_id, :clase_id, NOW(), NOW())
                   ON CONFLICT (estudiante_id, clase_id) DO NOTHING`,
                  {
                    replacements: { est_id: estRecord.id, clase_id: claseCheck[0].id },
                    type: QueryTypes.INSERT,
                    transaction
                  }
                );
                inscripcionesGuardadas++;
              }
            }
          }
        }

      } catch (error) {
        errores.push(`Fila ${i + 2}: ${error.message}`);
        console.error(`Error en fila ${i + 2}:`, error);
      }
    }

    console.log(`✅ Estudiantes nuevos: ${estudiantesGuardados}`);
    console.log(`🔄 Estudiantes actualizados: ${estudiantesActualizados}`);
    if (estudiantesSaltados > 0) {
      console.log(`⏭️  Estudiantes saltados (otra carrera): ${estudiantesSaltados}`);
    }
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
              estudiantes_saltados: estudiantesSaltados,
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
        estudiantes_saltados: estudiantesSaltados,
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

/**
 * @desc    Inscribir estudiantes individualmente o masivamente por IDs a una clase
 */
const inscribirEstudiantesManual = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clase_id, estudiante_ids } = req.body;
    const usuario = req.usuario;

    if (!clase_id || !estudiante_ids || !Array.isArray(estudiante_ids)) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    // Validar que la clase exista y pertenezca a la carrera si es director
    const [clase] = await sequelize.query('SELECT * FROM clases WHERE id = :clase_id', {
      replacements: { clase_id },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!clase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    if (usuario.rol === 'director' && clase.carrera !== usuario.carrera_director) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para gestionar esta clase' });
    }

    let inscritos = 0;
    for (const est_id of estudiante_ids) {
      await sequelize.query(
        `INSERT INTO estudiantes_materias (estudiante_id, clase_id, created_at, updated_at)
         VALUES (:est_id, :clase_id, NOW(), NOW())
         ON CONFLICT (estudiante_id, clase_id) DO NOTHING`,
        {
          replacements: { est_id, clase_id },
          type: QueryTypes.INSERT,
          transaction
        }
      );
      inscritos++;
    }

    // Actualizar conteo de estudiantes en la clase
    const [stats] = await sequelize.query(
      'SELECT COUNT(*) as total FROM estudiantes_materias WHERE clase_id = :clase_id',
      { replacements: { clase_id }, type: QueryTypes.SELECT, transaction }
    );

    await sequelize.query(
      'UPDATE clases SET num_estudiantes = :total WHERE id = :clase_id',
      { replacements: { total: stats.total, clase_id }, type: QueryTypes.UPDATE, transaction }
    );

    await transaction.commit();
    res.json({ success: true, mensaje: `${inscritos} estudiantes inscritos correctamente`, total: stats.total });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en inscribirEstudiantesManual:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Desvincular a un estudiante de una clase
 */
const desinscribirEstudiante = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clase_id, estudiante_id } = req.params;
    const usuario = req.usuario;

    const [clase] = await sequelize.query('SELECT * FROM clases WHERE id = :clase_id', {
      replacements: { clase_id },
      type: QueryTypes.SELECT,
      transaction
    });

    if (usuario.rol === 'director' && clase.carrera !== usuario.carrera_director) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para gestionar esta clase' });
    }

    await sequelize.query(
      'DELETE FROM estudiantes_materias WHERE clase_id = :clase_id AND estudiante_id = :estudiante_id',
      { replacements: { clase_id, estudiante_id }, type: QueryTypes.DELETE, transaction }
    );

    // Actualizar conteo
    const [stats] = await sequelize.query(
      'SELECT COUNT(*) as total FROM estudiantes_materias WHERE clase_id = :clase_id',
      { replacements: { clase_id }, type: QueryTypes.SELECT, transaction }
    );

    await sequelize.query(
      'UPDATE clases SET num_estudiantes = :total WHERE id = :clase_id',
      { replacements: { total: stats.total, clase_id }, type: QueryTypes.UPDATE, transaction }
    );

    await transaction.commit();
    res.json({ success: true, mensaje: 'Estudiante desvinculado correctamente', total: stats.total });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en desinscribirEstudiante:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Inscribir a todos los estudiantes de un nivel/carrera a una clase
 */
const inscribirNivelCompleto = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { clase_id, nivel } = req.body;
    const usuario = req.usuario;

    const [clase] = await sequelize.query('SELECT * FROM clases WHERE id = :clase_id', {
      replacements: { clase_id },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!clase) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Clase no encontrada' });
    }

    if (usuario.rol === 'director' && clase.carrera !== usuario.carrera_director) {
      await transaction.rollback();
      return res.status(403).json({ success: false, error: 'No tienes permiso para gestionar esta clase' });
    }

    // Buscar estudiantes del nivel y carrera (transliteración incluida para seguridad)
    const carreraActual = clase.carrera;
    const estudiantes = await sequelize.query(
      `SELECT id FROM estudiantes 
       WHERE nivel = :nivel 
       AND (escuela = :carrera OR escuela ILIKE :carrera)`,
      { replacements: { nivel, carrera: carreraActual }, type: QueryTypes.SELECT, transaction }
    );

    let inscritos = 0;
    for (const est of estudiantes) {
      await sequelize.query(
        `INSERT INTO estudiantes_materias (estudiante_id, clase_id, created_at, updated_at)
         VALUES (:est_id, :clase_id, NOW(), NOW())
         ON CONFLICT (estudiante_id, clase_id) DO NOTHING`,
        {
          replacements: { est_id: est.id, clase_id },
          type: QueryTypes.INSERT,
          transaction
        }
      );
      inscritos++;
    }

    // Actualizar conteo
    const [stats] = await sequelize.query(
      'SELECT COUNT(*) as total FROM estudiantes_materias WHERE clase_id = :clase_id',
      { replacements: { clase_id }, type: QueryTypes.SELECT, transaction }
    );

    await sequelize.query(
      'UPDATE clases SET num_estudiantes = :total WHERE id = :clase_id',
      { replacements: { total: stats.total, clase_id }, type: QueryTypes.UPDATE, transaction }
    );

    await transaction.commit();
    res.json({
      success: true,
      mensaje: `Se han inscrito ${inscritos} estudiantes de ${nivel} correctamente.`,
      total: stats.total
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en inscribirNivelCompleto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Obtener carga académica actual de un estudiante específico (para director)
 */
const getEstudianteLoad = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.usuario;

    // Buscar el estudiante
    const estudiante = await Estudiante.findByPk(id);
    if (!estudiante) {
      return res.status(404).json({ success: false, error: 'Estudiante no encontrado' });
    }

    // Verificar permisos si es director
    if (usuario.rol === 'director') {
      const carreraOriginal = usuario.carrera_director.trim();
      const escuelaEstudiante = (estudiante.escuela || '').trim();
      // Comparación flexible
      if (!escuelaEstudiante.toLowerCase().includes(carreraOriginal.toLowerCase()) &&
        !carreraOriginal.toLowerCase().includes(escuelaEstudiante.toLowerCase())) {
        return res.status(403).json({ success: false, error: 'No tienes permiso para ver estudiantes de otras carreras' });
      }
    }

    // Obtener materias inscritas con detalles de horario y aula
    const materias = await sequelize.query(`
        SELECT 
            c.*,
            em.fecha_inscripcion,
            a.nombre as aula_nombre,
            a.capacidad as aula_capacidad
        FROM estudiantes_materias em
        JOIN clases c ON em.clase_id = c.id
        LEFT JOIN aulas a ON a.codigo = c.aula_asignada
        WHERE em.estudiante_id = :id
        ORDER BY c.dia, c.hora_inicio
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      estudiante,
      materias
    });
  } catch (error) {
    console.error('Error en getEstudianteLoad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Sincronizar carga académica (inscripciones) desde Excel "Proyección de Cupos"
   * @route   POST /api/estudiantes/sync-proyeccion
   * @access  Admin, Director
   */
const subirProyeccionCupos = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.file) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({ success: false, error: 'No se recibió el archivo' });
    }

    const { processExcel } = require('../services/excel-parser.service');
    const result = processExcel(req.file.buffer);

    if (!result.clases || result.clases.length === 0) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'No se pudieron extraer datos válidos del Excel. Asegúrese de que tenga columnas de Cédula y Materia.'
      });
    }

    console.log(`📑 Procesando ${result.clases.length} registros de proyección de cupos...`);

    let procesados = 0;
    let vinculados = 0;
    let errores = [];

    // Para cada fila del Excel
    for (const record of result.clases) {
      procesados++;
      const cedula = record.cedula;
      const materiaNombre = record.materia;
      const paralelo = record.paralelo;

      if (!cedula || !materiaNombre) {
        continue;
      }

      // 1. Buscar estudiante
      const estudiante = await Estudiante.findOne({
        where: { cedula },
        transaction
      });

      if (!estudiante) {
        errores.push(`Fila ${procesados}: Estudiante con cédula ${cedula} no encontrado.`);
        continue;
      }

      // 2. Buscar la clase (materia + paralelo), filtrando por carrera del estudiante
      const { Clase } = require('../models');
      const whereClase = {
        [Op.or]: [
          { materia: { [Op.iLike]: `%${materiaNombre}%` } },
          { codigo: { [Op.iLike]: `%${materiaNombre}%` } }
        ]
      };

      // Filtrar por carrera del estudiante para evitar vínculos cruzados entre carreras
      if (estudiante.escuela && estudiante.escuela !== 'Sin especificar') {
        whereClase.carrera = { [Op.iLike]: `%${estudiante.escuela}%` };
      }

      if (paralelo) {
        whereClase.paralelo = paralelo;
      }

      const clase = await Clase.findOne({
        where: whereClase,
        transaction
      });

      if (!clase) {
        errores.push(`Fila ${procesados}: No se encontró la clase para "${materiaNombre}"${paralelo ? ` paralelo ${paralelo}` : ''}.`);
        continue;
      }

      // 3. Vincular (estudiantes_materias)
      const existe = await sequelize.query(
        'SELECT 1 FROM estudiantes_materias WHERE estudiante_id = :eid AND clase_id = :cid LIMIT 1',
        {
          replacements: { eid: estudiante.id, cid: clase.id },
          type: QueryTypes.SELECT,
          transaction
        }
      );

      if (existe.length === 0) {
        await sequelize.query(
          'INSERT INTO estudiantes_materias (estudiante_id, clase_id, fecha_inscripcion) VALUES (:eid, :cid, NOW())',
          {
            replacements: { eid: estudiante.id, cid: clase.id },
            type: QueryTypes.INSERT,
            transaction
          }
        );
        vinculados++;
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: `Sincronización completada: ${vinculados} inscripciones nuevas creadas.`,
      detalles: {
        total_excel: result.clases.length,
        procesados,
        vinculados_nuevos: vinculados,
        errores: errores.slice(0, 50)
      }
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error en subirProyeccionCupos:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la proyección: ' + error.message });
  }
};

module.exports = {
  lookupEstudianteByEmail,
  loginEstudianteByCedula,
  subirEstudiantes,
  subirProyeccionCupos,
  obtenerHistorialCargas,
  listarEstudiantes,
  getEstudianteLoad,
  inscribirEstudiantesManual,
  desinscribirEstudiante,
  inscribirNivelCompleto
};
