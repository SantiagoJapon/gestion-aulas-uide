const { User, Carrera, DirectorCarrera, sequelize } = require('../models');
const { Op } = require('sequelize');
const N8nService = require('../services/n8n.service');
const emailService = require('../services/emailService');
const { sincronizarCarreraLegado } = require('../utils/directorScope');

/**
 * Función centralizada para loggeo de errores 500
 */
const handle500 = (res, error, context) => {
  console.error(`❌ [500] Error en ${context}:`, error);
  res.status(500).json({
    success: false,
    error: `Error en ${context}`,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
};

const normalizeCarreraKey = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Función para corregir encoding UTF-8 mal codificado
const fixEncoding = (value) => {
  if (!value) return value;
  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã'/g, 'Ñ')
    .replace(/Â/g, '')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã/g, 'Ü')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡');
};

const getUsuarios = async (req, res) => {
  try {
    const { rol, carrera_id } = req.query;
    const where = {};
    if (rol) where.rol = rol;

    // Si el usuario es director, forzar filtro por TODAS sus carreras asignadas
    if (req.usuario.rol === 'director') {
      const nombres = req.usuario.carreraNombres || [];
      where.carrera_director = nombres.length > 0 ? { [Op.in]: nombres } : '__NON_EXISTENT__';
    } else if (carrera_id) {
      const carreraObj = await Carrera.findByPk(carrera_id);
      if (carreraObj) {
        where.carrera_director = carreraObj.carrera;
      } else {
        where.carrera_director = '__NON_EXISTENT__';
      }
    }

    // Si estamos buscando directores, incluir información de las carreras asociadas
    const include = rol === 'director' ? [
      {
        model: Carrera,
        as: 'carrera',
        attributes: ['id', 'carrera', 'carrera_normalizada'],
        required: false
      },
      {
        model: Carrera,
        as: 'carrerasAsignadas',
        attributes: ['id', 'carrera', 'carrera_normalizada'],
        through: { attributes: [] },
        required: false
      }
    ] : [];

    const usuarios = await User.findAll({
      where,
      include,
      order: [['apellido', 'ASC'], ['nombre', 'ASC']]
    });

    res.json({
      success: true,
      total: usuarios.length,
      usuarios: usuarios.map((u) => {
        const json = u.toJSON();
        if (json.carrerasAsignadas && json.carrerasAsignadas.length > 0) {
          json.carreras = json.carrerasAsignadas;
          json.carrera_nombre = json.carrerasAsignadas.map(c => c.carrera).join(', ');
        } else if (json.carrera) {
          json.carrera_nombre = json.carrera.carrera;
          json.carreras = [json.carrera];
        }
        delete json.carrera;
        delete json.carrerasAsignadas;
        return json;
      })
    });
  } catch (error) {
    handle500(res, error, 'getUsuarios');
  }
};

// Resuelve un identificador de carrera (id numérico, nombre exacto o nombre
// normalizado) al registro Carrera correspondiente. Devuelve null si no existe.
const resolverCarrera = async (item) => {
  let result = null;
  if (typeof item === 'number' || (!isNaN(item) && Number.isInteger(Number(item)))) {
    result = await Carrera.findByPk(item);
  }
  if (!result && typeof item === 'string') {
    result = await Carrera.findOne({ where: { carrera: item, activa: true } });
  }
  if (!result && typeof item === 'string') {
    const normKey = normalizeCarreraKey(item);
    result = await Carrera.findOne({ where: { carrera_normalizada: normKey, activa: true } });
  }
  return result;
};

const respuestaConCarreras = async (usuario, mensaje) => {
  const updatedUser = await User.findByPk(usuario.id, {
    include: [{
      model: Carrera,
      as: 'carrerasAsignadas',
      attributes: ['id', 'carrera', 'carrera_normalizada'],
      through: { attributes: [] }
    }]
  });

  const userJson = updatedUser.toJSON();
  userJson.carreras = userJson.carrerasAsignadas;
  delete userJson.carrerasAsignadas;
  delete userJson.carrera;

  return { success: true, message: mensaje, usuario: userJson };
};

/**
 * Gestiona la asignación de carreras de un director. Un director puede estar
 * asignado a más de una carrera a la vez (ej: dirige Ingeniería en Sistemas
 * Y Tecnologías de la Información simultáneamente).
 *
 * Formas de uso (mutuamente excluyentes, se evalúan en este orden):
 *   1. { carrera_ids: [1, 2] } o { carreras: ["A", "B"] }
 *        → REEMPLAZA el conjunto completo por exactamente estas carreras.
 *   2. { remove_carrera: "X" | id }
 *        → QUITA únicamente esa carrera; conserva las demás asignadas.
 *   3. { carrera: "X" | id }
 *        → AGREGA esa carrera al conjunto actual; conserva las demás.
 *          (Esta es la forma que usa la UI de "Asignar Director" por carrera.)
 *   4. { carrera: null } sin ninguno de los anteriores
 *        → Desasigna TODAS las carreras del director.
 */
const updateDirectorCarrera = async (req, res) => {
  try {
    const { id } = req.params;
    const { carrera, carreras, carrera_ids, remove_carrera } = req.body;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    if (usuario.rol !== 'director') {
      return res.status(400).json({
        success: false,
        error: 'El usuario no es director'
      });
    }

    // ── Modo 1: reemplazo total explícito (lista completa) ──────────────
    if (Array.isArray(carrera_ids) || Array.isArray(carreras)) {
      const listInput = Array.isArray(carrera_ids) ? carrera_ids : carreras;

      if (listInput.length === 0) {
        await DirectorCarrera.destroy({ where: { usuario_id: usuario.id } });
        await usuario.update({ carrera_director: null });
        return res.json(await respuestaConCarreras(usuario, 'Carreras desasignadas'));
      }

      const carrerasEncontradas = [];
      for (const item of listInput) {
        const result = await resolverCarrera(item);
        if (result && !carrerasEncontradas.some((c) => c.id === result.id)) {
          carrerasEncontradas.push(result);
        }
      }

      if (carrerasEncontradas.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Ninguna de las carreras especificadas existe o está activa'
        });
      }

      await DirectorCarrera.destroy({ where: { usuario_id: usuario.id } });
      for (const c of carrerasEncontradas) {
        await DirectorCarrera.create({ usuario_id: usuario.id, carrera_id: c.id });
      }
      await usuario.update({ carrera_director: carrerasEncontradas[0].carrera });

      if (usuario.telefono) {
        N8nService.emit('notificacion', {
          tipo: 'director_notificado',
          datos: {
            nombre: `${usuario.nombre} ${usuario.apellido}`,
            telefono: usuario.telefono,
            password: '(usa tu contraseña actual)',
            carrera: carrerasEncontradas.map((c) => c.carrera).join(', ')
          }
        });
      }

      return res.json(await respuestaConCarreras(usuario, 'Carreras asignadas correctamente'));
    }

    // ── Modo 2: quitar una carrera puntual (conserva el resto) ───────────
    if (remove_carrera !== undefined && remove_carrera !== null) {
      const carreraAQuitar = await resolverCarrera(remove_carrera);
      if (!carreraAQuitar) {
        return res.status(400).json({ success: false, error: 'La carrera a quitar no existe' });
      }

      await DirectorCarrera.destroy({
        where: { usuario_id: usuario.id, carrera_id: carreraAQuitar.id }
      });
      await sincronizarCarreraLegado(usuario);

      return res.json(await respuestaConCarreras(usuario, `Carrera "${carreraAQuitar.carrera}" desvinculada`));
    }

    // ── Modo 4: desasignación total (carrera explícitamente null/vacío) ──
    if (carrera === null || carrera === undefined || (typeof carrera === 'string' && !carrera.trim())) {
      await DirectorCarrera.destroy({ where: { usuario_id: usuario.id } });
      await usuario.update({ carrera_director: null });
      return res.json(await respuestaConCarreras(usuario, 'Carreras desasignadas'));
    }

    // ── Modo 3: agregar UNA carrera al conjunto actual ───────────────────
    const nuevaCarrera = await resolverCarrera(typeof carrera === 'string' ? carrera.trim() : carrera);
    if (!nuevaCarrera) {
      return res.status(400).json({
        success: false,
        error: 'La carrera no está activa o no existe',
        debug: { carrera_buscada: carrera }
      });
    }

    // Una carrera tiene un único director a la vez. Si ya hay OTRO director
    // vinculado a esta carrera, lo desvinculamos primero — solo de esta
    // carrera, conserva el resto de sus carreras asignadas — antes de
    // vincular al nuevo. Sin esto, ambos quedaban vinculados a la vez.
    const vinculoAnterior = await DirectorCarrera.findOne({
      where: { carrera_id: nuevaCarrera.id, usuario_id: { [Op.ne]: usuario.id } }
    });
    if (vinculoAnterior) {
      const directorAnteriorId = vinculoAnterior.usuario_id;
      await vinculoAnterior.destroy();
      const directorAnterior = await User.findByPk(directorAnteriorId);
      if (directorAnterior) {
        await sincronizarCarreraLegado(directorAnterior);
      }
    }

    const [, creado] = await DirectorCarrera.findOrCreate({
      where: { usuario_id: usuario.id, carrera_id: nuevaCarrera.id },
      defaults: { usuario_id: usuario.id, carrera_id: nuevaCarrera.id }
    });

    // Si ya no tenía ninguna carrera (o esta es la única), sincronizamos el
    // campo legado. Si ya tenía otra(s) asignada(s), la dejamos intacta —
    // agregar una segunda carrera nunca debe pisar la principal existente.
    if (!usuario.carrera_director) {
      await usuario.update({ carrera_director: nuevaCarrera.carrera });
    }

    if (creado && usuario.telefono) {
      N8nService.emit('notificacion', {
        tipo: 'director_notificado',
        datos: {
          nombre: `${usuario.nombre} ${usuario.apellido}`,
          telefono: usuario.telefono,
          password: '(usa tu contraseña actual)',
          carrera: nuevaCarrera.carrera
        }
      });
    }

    return res.json(await respuestaConCarreras(
      usuario,
      creado ? 'Carrera asignada correctamente' : 'El director ya estaba asignado a esta carrera'
    ));
  } catch (error) {
    handle500(res, error, 'updateDirectorCarrera');
  }
};

const createUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, carrera_director, cedula, telefono } = req.body;

    // Restricciones para Directores
    let finalRol = rol || 'docente';
    let finalCarrera = carrera_director;

    if (req.usuario.rol === 'director') {
      if (finalRol === 'admin') finalRol = 'docente';
      // Un director puede crear docentes en CUALQUIERA de sus carreras asignadas.
      // Si el valor enviado no le pertenece (o no envió ninguno), usamos su
      // primera carrera como respaldo — nunca dejamos que asigne una carrera
      // fuera de su alcance.
      const carrerasDelDirector = req.usuario.carreraNombres || [];
      finalCarrera = carrerasDelDirector.includes(carrera_director)
        ? carrera_director
        : carrerasDelDirector[0] || null;
    }

    // Para directores: usar contraseña temporal estándar
    const passwordFinal = (finalRol === 'director') ? 'uide2026' : (password || 'uide2026');

    // Crear el usuario (el password se hashea en el hook beforeCreate)
    const newUsuario = await User.create({
      nombre,
      apellido,
      email,
      password: passwordFinal,
      rol: finalRol,
      carrera_director: finalCarrera,
      cedula: cedula || null,
      telefono: telefono || null,
      estado: 'activo',
      requiere_cambio_password: true
    });

    // Si se creó un director con una carrera inicial, registrarla también en
    // la tabla puente director_carreras (fuente de verdad para multi-carrera).
    if (finalRol === 'director' && finalCarrera) {
      const carreraInicial = await Carrera.findOne({ where: { carrera: finalCarrera } });
      if (carreraInicial) {
        await DirectorCarrera.create({ usuario_id: newUsuario.id, carrera_id: carreraInicial.id });
      }
    }

    // Notificar al usuario si tiene telefono
    let whatsapp_enviado = false;
    if (newUsuario.telefono && (finalRol === 'director' || finalRol === 'docente')) {
      try {
        const whatsappService = require('../services/whatsappService');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const msg = `🎓 *Universidad Internacional del Ecuador*\n_Sistema de Gestión de Aulas_\n\n¡Hola *${nombre} ${apellido}*! 👋\n\nTu cuenta ha sido creada exitosamente. Hemos enviado tus credenciales de acceso al correo *${email}*.\n\n📩 Por favor revisa tu bandeja de entrada y, si no la encuentras en unos minutos, échale un vistazo a la carpeta de *spam o correo no deseado*.\n\n🌐 Ingresa aquí: ${frontendUrl}\n\nSi tienes algún inconveniente, no dudes en contactarnos.`;
        whatsapp_enviado = await whatsappService.sendMessage(newUsuario.telefono, msg);
      } catch (wErr) {
        console.warn('⚠️ WhatsApp no disponible al crear usuario:', wErr.message);
      }
    }

    // Enviar credenciales por email (siempre que sea director o docente)
    let email_enviado = false;
    if (finalRol === 'director' || finalRol === 'docente') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const emailResult = await emailService.enviarCredenciales({
        email: newUsuario.email,
        nombre: `${nombre} ${apellido}`.trim(),
        passwordTemporal: passwordFinal,
        rol: finalRol,
        linkAcceso: frontendUrl
      });
      email_enviado = emailResult.success;
      if (email_enviado) {
        console.log(`✅ Email de credenciales enviado a ${newUsuario.email}`);
      } else {
        console.warn(`⚠️ No se pudo enviar email a ${newUsuario.email}: ${emailResult.error}`);
      }
    }

    // Respuesta con credenciales para directores y docentes
    const responseData = {
      success: true,
      mensaje: 'Usuario creado exitosamente',
      usuario: newUsuario.toJSON()
    };

    if (finalRol === 'director' || finalRol === 'docente') {
      responseData.credenciales = {
        email: newUsuario.email,
        password: passwordFinal,
        email_enviado,
        whatsapp_enviado
      };
    }

    res.status(201).json(responseData);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError' && error.fields?.email) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    handle500(res, error, 'createUsuario');
  }
};


const generarCredencialesUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const whatsappService = require('../services/whatsappService');
    const emailService = require('../services/emailService');

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Solo admin puede hacer esto para directores
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede generar credenciales para directores' });
    }

    // Resetear contraseña temporal (en texto plano — el hook beforeUpdate la hasheará)
    usuario.password = 'uide2026';
    usuario.requiere_cambio_password = true;
    await usuario.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();

    // Enviar email
    let email_enviado = false;
    const emailResult = await emailService.enviarCredenciales({
      email: usuario.email,
      nombre: nombreCompleto,
      passwordTemporal: 'uide2026',
      rol: usuario.rol,
      linkAcceso: frontendUrl
    });
    email_enviado = emailResult.success;
    if (emailResult.success) {
      console.log('✅ Email enviado exitosamente a:', usuario.email);
    } else {
      console.warn('⚠️ Error enviando email:', emailResult.error);
    }

    let whatsapp_enviado = false;
    if (usuario.telefono) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const msg = `🎓 *Universidad Internacional del Ecuador*\n_Sistema de Gestión de Aulas_\n\n¡Hola *${usuario.nombre} ${usuario.apellido}*!\n\nTus credenciales de acceso han sido generadas nuevamente. Las enviamos al correo *${usuario.email}*.\n\n📩 Por favor revisa tu bandeja de entrada y, si no la encuentras en unos minutos, échale un vistazo a la carpeta de *spam o correo no deseado*.\n\n🌐 Ingresa aquí: ${frontendUrl}\n\nSi tienes algún inconveniente, no dudes en contactarnos.`;
      whatsapp_enviado = await whatsappService.sendMessage(usuario.telefono, msg);
    }

    res.json({
      success: true,
      credenciales: { email: usuario.email, password: 'uide2026', whatsapp_enviado, email_enviado },
      mensaje: 'Credenciales generadas exitosamente'
    });
  } catch (error) {
    handle500(res, error, 'generarCredencialesUsuario');
  }
};

const resetPasswordUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const bcrypt = require('bcryptjs');

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Directores solo pueden resetear docentes de alguna de sus carreras asignadas
    if (req.usuario.rol === 'director' && !(req.usuario.carreraNombres || []).includes(usuario.carrera_director)) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para este usuario' });
    }

    // Nueva contraseña: cédula del usuario o 'uide123'
    const newPassword = usuario.cedula || 'uide123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await usuario.update({ password: hashedPassword }, { hooks: false });

    res.json({
      success: true,
      mensaje: `Contraseña reseteada a ${usuario.cedula ? 'número de cédula' : 'uide123'}`
    });
  } catch (error) {
    handle500(res, error, 'resetPasswordUsuario');
  }
};

const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, rol, estado, cedula, telefono, carrera_director } = req.body;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const carrerasDelDirector = req.usuario.carreraNombres || [];

    if (req.usuario.rol === 'director' && !carrerasDelDirector.includes(usuario.carrera_director)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para editar este usuario'
      });
    }

    let updatedFields = { nombre, apellido, email, rol, estado, cedula, telefono, carrera_director };

    if (req.usuario.rol === 'director') {
      // Director no puede escalar privilegios: no puede asignar admin ni director
      if (rol && ['admin', 'director'].includes(rol)) delete updatedFields.rol;
      // Director puede mover al usuario entre SUS PROPIAS carreras, pero nunca
      // hacia una carrera fuera de su alcance. Si el valor enviado no le
      // pertenece (o no se envió), conservamos la carrera actual del usuario.
      updatedFields.carrera_director = carrerasDelDirector.includes(carrera_director)
        ? carrera_director
        : usuario.carrera_director;
      // Director no puede editar admins ni a otros directores
      if (['admin', 'director'].includes(usuario.rol)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para editar directores o administradores'
        });
      }
    }

    await usuario.update(updatedFields);

    res.json({
      success: true,
      mensaje: 'Usuario actualizado exitosamente',
      usuario: usuario.toJSON()
    });
  } catch (error) {
    handle500(res, error, 'updateUsuario');
  }
};

const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Un director no puede eliminarse a sí mismo ni a otros directores/admins
    if (req.usuario.rol === 'director') {
      if (['admin', 'director'].includes(usuario.rol)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para eliminar directores o administradores'
        });
      }
      if (!(req.usuario.carreraNombres || []).includes(usuario.carrera_director)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para eliminar este usuario'
        });
      }
    }

    // Nadie puede eliminarse a sí mismo
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    await usuario.destroy();

    res.json({
      success: true,
      mensaje: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'No se pudo eliminar: hay datos vinculados a este usuario que la base de datos no pudo reasignar automáticamente. Contacta a soporte técnico (falta una regla de eliminación en cascada para esta relación).',
        message: error.message
      });
    }
    handle500(res, error, 'deleteUsuario');
  }
};

module.exports = {
  getUsuarios,
  updateDirectorCarrera,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  resetPasswordUsuario,
  generarCredencialesUsuario
};
