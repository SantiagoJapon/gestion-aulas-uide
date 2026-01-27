const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op } = require('sequelize');
const DistribucionService = require('../services/distribucion.service');

/**
 * Controlador para endpoints del Bot de Telegram/WhatsApp
 */

// Buscar disponibilidad de aulas
const buscarDisponibilidad = async (req, res) => {
  try {
    const { dia, hora_inicio, hora_fin, capacidad, caracteristicas } = req.query;

    if (!dia || !hora_inicio || !hora_fin) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos: dia, hora_inicio, hora_fin' 
      });
    }

    // Obtener todas las aulas disponibles
    const aulas = await Aula.findAll({
      where: { estado: 'disponible' }
    });

    // Obtener distribuciones existentes para ese día
    const distribuciones = await Distribucion.findAll({
      where: { dia: dia }
    });

    // Objeto simulado de clase para usar la lógica de DistribucionService
    const claseSimulada = {
      horario_dia: dia,
      horario_inicio: hora_inicio,
      horario_fin: hora_fin,
      numero_estudiantes: parseInt(capacidad) || 20,
      carrera: 'EXTERNO' // Para evitar prioridad específica
    };

    // Usar el servicio de distribución para encontrar aulas libres
    // Nota: encontrarAulasDisponibles filtra por capacidad y conflictos horarios
    const aulasDisponibles = await DistribucionService.encontrarAulasDisponibles(
      claseSimulada, 
      aulas, 
      distribuciones
    );

    // Filtrar por características adicionales si se solicitan
    let resultados = aulasDisponibles;
    if (caracteristicas) {
      const chars = caracteristicas.split(',');
      resultados = resultados.filter(aula => {
        // Asumiendo que 'caracteristicas' es un campo en Aula o similar
        // Si no existe, esta lógica deberá ajustarse al modelo real de Aula
        return true; 
      });
    }

    res.json({
      success: true,
      count: resultados.length,
      aulas: resultados.map(a => ({
        id: a.id,
        nombre: a.nombre,
        ubicacion: a.ubicacion,
        capacidad: a.capacidad,
        tipo: a.tipo
      }))
    });

  } catch (error) {
    console.error('Error en buscarDisponibilidad:', error);
    res.status(500).json({ error: 'Error interno al buscar disponibilidad' });
  }
};

// Buscar dónde está un docente
const ubicarDocente = async (req, res) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Debe proporcionar un nombre de docente' });
    }

    const clases = await Clase.findAll({
      where: {
        docente: { [Op.iLike]: `%${nombre}%` }
      },
      include: [
        { 
          model: Aula,
          as: 'aula', // Ajustar según asociación real
          required: false
        }
      ],
      limit: 10
    });

    // Si no hay asociación directa en include, buscar distribución
    // (Depende de cómo esté modelada la relación Clase <-> Aula <-> Distribucion)
    
    // Simplificación: Devolver clases encontradas
    const resultados = clases.map(c => ({
      materia: c.nombre_materia,
      docente: c.docente,
      dia: c.horario_dia,
      hora: `${c.horario_inicio} - ${c.horario_fin}`,
      aula: c.aula_asignada || 'No asignada', // Aquí idealmente haríamos join con Distribucion
      ubicacion: 'TBD'
    }));

    res.json({
      success: true,
      resultados
    });

  } catch (error) {
    console.error('Error en ubicarDocente:', error);
    res.status(500).json({ error: 'Error interno al buscar docente' });
  }
};

// Crear una reserva (simplificado)
const crearReserva = async (req, res) => {
  try {
    const { aula_id, dia, hora_inicio, hora_fin, motivo, solicitante } = req.body;

    // Validaciones básicas...
    
    // Lógica de reserva pendiente de definición exacta
    // Podría crear un registro en una tabla 'Reservas' o 'Distribucion' con estado especial
    
    res.json({
      success: true,
      message: 'Funcionalidad de reserva en construcción',
      datos: req.body
    });

  } catch (error) {
    console.error('Error en crearReserva:', error);
    res.status(500).json({ error: 'Error al procesar reserva' });
  }
};

module.exports = {
  buscarDisponibilidad,
  ubicarDocente,
  crearReserva
};
