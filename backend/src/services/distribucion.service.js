const { Clase, Aula, Distribucion, Carrera } = require('../models');
const { Op } = require('sequelize');

class DistribucionService {
  
  /**
   * Ejecuta la distribución automática de aulas
   */
  async ejecutarDistribucion() {
    try {
      console.log('🚀 Iniciando distribución automática de aulas...\n');

      // 1. Obtener todas las clases sin aula asignada
      const clases = await Clase.findAll({
        where: {
          aula_asignada: null
        },
        order: [['num_estudiantes', 'DESC']] // Ordenar por tamaño de clase (más grande primero)
      });

      console.log(`📚 Clases a distribuir: ${clases.length}`);

      if (clases.length === 0) {
        return {
          success: true,
          mensaje: 'No hay clases pendientes de distribución',
          estadisticas: {
            total_procesadas: 0,
            exitosas: 0,
            fallidas: 0
          }
        };
      }

      // 2. Obtener todas las aulas disponibles
      const aulas = await Aula.findAll({
        where: {
          estado: 'DISPONIBLE'
        },
        order: [['capacidad', 'ASC']] // Ordenar por capacidad (más pequeña primero para optimizar)
      });

      console.log(`🏛️  Aulas disponibles: ${aulas.length}\n`);

      let exitosas = 0;
      let fallidas = 0;

      // 3. Asignar cada clase a un aula
      for (const clase of clases) {
        const aulaAsignada = await this.asignarAula(clase, aulas);
        
        if (aulaAsignada) {
          // Actualizar la clase con el aula asignada
          await clase.update({
            aula_asignada: aulaAsignada.codigo
          });

          // Crear registro en la tabla de distribución
          await Distribucion.create({
            clase_id: clase.id,
            aula_id: aulaAsignada.id,
            dia: clase.dia,
            hora_inicio: clase.hora_inicio,
            hora_fin: clase.hora_fin,
            estado: 'confirmada'
          });

          exitosas++;
          console.log(`  ✅ ${clase.carrera} - ${clase.materia} → ${aulaAsignada.codigo} (Cap: ${aulaAsignada.capacidad})`);
        } else {
          fallidas++;
          console.log(`  ❌ ${clase.carrera} - ${clase.materia} → Sin aula disponible`);
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log(`✅ Distribución completada:`);
      console.log(`   • Total procesadas: ${clases.length}`);
      console.log(`   • Exitosas: ${exitosas}`);
      console.log(`   • Fallidas: ${fallidas}`);
      console.log('='.repeat(80));

      return {
        success: true,
        mensaje: 'Distribución completada exitosamente',
        estadisticas: {
          total_procesadas: clases.length,
          exitosas,
          fallidas
        }
      };

    } catch (error) {
      console.error('❌ Error en distribución:', error);
      throw error;
    }
  }

  /**
   * Asigna un aula a una clase específica
   */
  async asignarAula(clase, aulas) {
    // Filtrar aulas que cumplan con los requisitos
    const aulasCompatibles = aulas.filter(aula => {
      // 1. Verificar capacidad
      if (aula.capacidad < clase.num_estudiantes) {
        return false;
      }

      // 2. Verificar restricción de carrera
      if (aula.restriccion_carrera && aula.restriccion_carrera !== clase.carrera) {
        return false;
      }

      // 3. Verificar disponibilidad horaria (que no esté ocupada en ese horario)
      // Por ahora simplificado - se puede mejorar después
      return true;
    });

    // Si no hay aulas compatibles, intentar con cualquier aula sin restricción
    if (aulasCompatibles.length === 0) {
      const aulasSinRestriccion = aulas.filter(aula => 
        aula.capacidad >= clase.num_estudiantes && !aula.restriccion_carrera
      );
      
      if (aulasSinRestriccion.length > 0) {
        // Retornar la más pequeña que cumpla
        return aulasSinRestriccion[0];
      }
      
      return null;
    }

    // Retornar el aula más adecuada (la más pequeña que cumpla con los requisitos)
    return aulasCompatibles[0];
  }

  /**
   * Obtiene el horario de una carrera específica
   */
  async obtenerHorario(carreraId = null) {
    try {
      const whereClause = {};
      if (carreraId) {
        const carrera = await Carrera.findByPk(carreraId);
        if (carrera) {
          whereClause.carrera = carrera.carrera;
        }
      }

      const clases = await Clase.findAll({
        where: {
          ...whereClause,
          aula_asignada: { [Op.not]: null }
        },
        order: [['dia', 'ASC'], ['hora_inicio', 'ASC']]
      });

      // Obtener aulas y agregarlas manualmente
      const aulasMap = {};
      const aulas = await Aula.findAll();
      aulas.forEach(aula => {
        aulasMap[aula.codigo] = {
          id: aula.id,
          codigo: aula.codigo,
          nombre: aula.nombre,
          capacidad: aula.capacidad,
          tipo: aula.tipo
        };
      });

      // Agregar información del aula a cada clase
      const clasesConAula = clases.map(clase => {
        const claseJson = clase.toJSON();
        if (claseJson.aula_asignada && aulasMap[claseJson.aula_asignada]) {
          claseJson.aula = aulasMap[claseJson.aula_asignada];
        }
        return claseJson;
      });

      return clasesConAula;
    } catch (error) {
      console.error('Error al obtener horario:', error);
      throw error;
    }
  }

  /**
   * Limpia todas las asignaciones de aulas
   */
  async limpiarDistribucion() {
    try {
      // Limpiar tabla de distribución
      await Distribucion.destroy({ where: {}, truncate: true });
      
      // Limpiar aula_asignada de todas las clases
      await Clase.update(
        { aula_asignada: null },
        { where: {} }
      );

      return {
        success: true,
        mensaje: 'Distribución limpiada exitosamente'
      };
    } catch (error) {
      console.error('Error al limpiar distribución:', error);
      throw error;
    }
  }
}

module.exports = new DistribucionService();
