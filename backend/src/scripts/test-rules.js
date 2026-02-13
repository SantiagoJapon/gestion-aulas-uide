const { Aula, Clase, Distribucion, Carrera, sequelize } = require('../models');
const distribucionService = require('../services/distribucion.service');
const { Op } = require('sequelize');

async function testRules() {
    console.log('🧪 INICIANDO TEST DE REGLAS Y PRIORIDADES UIDE...\n');

    try {
        // 1. Limpieza de datos de prueba previos
        console.log('🧹 Limpiando datos de prueba...');
        await Distribucion.destroy({ where: {} });
        await Clase.destroy({ where: { carrera: { [Op.like]: 'TEST_%' } } });
        await Aula.destroy({ where: { codigo: { [Op.like]: 'TEST_%' } } });

        // 2. Crear Aulas de Prueba
        console.log('🏫 Creando aulas de prueba...');
        const aulas = await Aula.bulkCreate([
            { codigo: 'TEST_AUDIENCIAS', nombre: 'SALA DE AUDIENCIAS', capacidad: 30, tipo: 'ESPECIAL', estado: 'DISPONIBLE' },
            { codigo: 'TEST_A16', nombre: 'AULA 16', capacidad: 40, tipo: 'TALLER', estado: 'DISPONIBLE' }, // Arquitectura
            { codigo: 'TEST_LAB1', nombre: 'LABORATORIO 1', capacidad: 25, tipo: 'LABORATORIO', estado: 'DISPONIBLE' }, // Prioridad IT
            { codigo: 'TEST_MAGNA', nombre: 'AULA MAGNA', capacidad: 80, tipo: 'GENERAL', estado: 'DISPONIBLE' },
            { codigo: 'TEST_SMALL', nombre: 'AULA PEQUEÑA', capacidad: 15, tipo: 'GENERAL', estado: 'DISPONIBLE' },
            { codigo: 'TEST_AUDITORIO', nombre: 'AUDITORIO', capacidad: 200, tipo: 'ESPECIAL', estado: 'DISPONIBLE' } // Excluido
        ]);

        // 3. Crear Clases de Prueba
        console.log('📚 Creando clases de prueba...');
        const clases = await Clase.bulkCreate([
            {
                materia: 'Derecho Procesal (DERECHO)',
                carrera: 'DERECHO',
                num_estudiantes: 20,
                dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00'
            },
            {
                materia: 'Taller de Maquetas (ARQUITECTURA)',
                carrera: 'ARQUITECTURA',
                num_estudiantes: 15,
                dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00'
            },
            {
                materia: 'Programación Avanzada (SISTEMAS)',
                carrera: 'SISTEMAS',
                num_estudiantes: 20,
                dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00'
            },
            {
                materia: 'Marketing Masivo (NEGOCIOS)',
                carrera: 'NEGOCIOS',
                num_estudiantes: 70,
                dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00'
            },
            {
                materia: 'Psicología Social (PSICOLOGIA)',
                carrera: 'PSICOLOGIA',
                num_estudiantes: 30,
                dia: 'LUNES', hora_inicio: '08:00', hora_fin: '10:00'
            },
            {
                materia: 'Clase con Sobrecupo (TEST)',
                carrera: 'TEST_SOBRECUPO',
                num_estudiantes: 100, // No hay aula de 100
                dia: 'LUNES', hora_inicio: '10:00', hora_fin: '12:00'
            }
        ]);

        console.log('\n🚀 Ejecutando Distribución Maestra...');
        const resultado = await distribucionService.ejecutarDistribucion();

        console.log('\n📊 RESULTADOS DE LA DISTRIBUCIÓN:');
        console.log(`✅ Exitosas: ${resultado.estadisticas.exitosas}`);
        console.log(`⚠️ Sobrecupos: ${resultado.estadisticas.sobrecupos}`);
        console.log(`❌ Fallidas: ${resultado.estadisticas.fallidas}`);

        // 4. Verificar asignaciones específicas
        console.log('\n🔍 Verificando cumplimiento de reglas:');

        const clasesAsignadas = await Clase.findAll({
            where: { carrera: { [Op.in]: ['DERECHO', 'ARQUITECTURA', 'SISTEMAS', 'NEGOCIOS', 'PSICOLOGIA', 'TEST_SOBRECUPO'] } },
            include: [{ model: Distribucion, as: 'distribuciones' }]
        });

        clasesAsignadas.forEach(c => {
            const dist = c.distribuciones[0];
            const estado = dist ? dist.estado : 'N/A';
            console.log(`  - ${c.materia.padEnd(35)} → ${c.aula_asignada.padEnd(15)} | Estado: ${estado}`);
        });

        // Validaciones lógicas
        const derecho = clasesAsignadas.find(c => c.carrera === 'DERECHO');
        if (derecho.aula_asignada === 'TEST_AUDIENCIAS') console.log('  🟢 REGLA DERECHO: OK (Sala Audiencias)');
        else console.log('  🔴 REGLA DERECHO: FALLÓ');

        const arq = clasesAsignadas.find(c => c.carrera === 'ARQUITECTURA');
        if (arq.aula_asignada === 'TEST_A16') console.log('  🟢 REGLA ARQUITECTURA: OK (Aula 16)');
        else console.log('  🔴 REGLA ARQUITECTURA: FALLÓ');

        const it = clasesAsignadas.find(c => c.carrera === 'SISTEMAS');
        if (it.aula_asignada === 'TEST_LAB1') console.log('  🟢 REGLA PRIORIDAD IT: OK (Laboratorio 1)');
        else console.log('  🔴 REGLA PRIORIDAD IT: FALLÓ');

        const sobrecupo = clasesAsignadas.find(c => c.carrera === 'TEST_SOBRECUPO');
        if (sobrecupo.aula_asignada === 'TEST_MAGNA') console.log('  🟢 REGLA SOBRECUPO: OK (Asignó Aula Magna con advertencia)');
        else console.log('  🔴 REGLA SOBRECUPO: FALLÓ');

        const auditorio = clasesAsignadas.some(c => c.aula_asignada === 'TEST_AUDITORIO');
        if (!auditorio) console.log('  🟢 REGLA EXCLUSIÓN AUDITORIO: OK (No se usó)');
        else console.log('  🔴 REGLA EXCLUSIÓN AUDITORIO: FALLÓ');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el test:', error);
        process.exit(1);
    }
}

testRules();
