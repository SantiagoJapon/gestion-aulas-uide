/**
 * 🧪 SIMULADOR DE DISTRIBUCIÓN MAESTRA UIDE v2
 * Prueba la lógica de asignación, prioridades y sobrecupo.
 */

const REGLAS_AULAS = {
    excluidas_distribucion: ['AUDITORIO'],
    exclusivas: {
        'SALA DE AUDIENCIAS': ['DERECHO'],
        'AULA 20': ['PSICOLOGIA', 'PSICOLOGÍA'],
        'AULA 16': ['ARQUITECTURA'],
    },
    prioridad: {
        'LABORATORIO 1': ['INFORMATICA', 'SISTEMAS', 'TECNOLOGIA'],
        'LABORATORIO 2': ['INFORMATICA', 'SISTEMAS', 'TECNOLOGIA'],
    }
};

const normalizarTexto = (t) => t ? t.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const aulaEsExclusiva = (aula, carrera) => {
    if (!aula || !aula.nombre) return 'permitida';
    const nombreAulaNorm = normalizarTexto(aula.nombre);
    const carreraNorm = normalizarTexto(carrera);

    for (const [key, carreras] of Object.entries(REGLAS_AULAS.exclusivas)) {
        if (nombreAulaNorm.includes(key)) {
            return carreras.some(c => carreraNorm.includes(c)) ? 'permitida' : 'bloqueada';
        }
    }
    return 'permitida';
};

const aulaConPrioridad = (aula) => {
    if (!aula || !aula.nombre) return null;
    const nombreAulaNorm = normalizarTexto(aula.nombre);
    for (const [key, carreras] of Object.entries(REGLAS_AULAS.prioridad)) {
        if (nombreAulaNorm.includes(key)) return carreras;
    }
    return null;
};

const convertirHoraAMinutos = (hora) => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
};

const aulaDisponibleEnHorario = (codigoAula, clase, aulasOcupadas) => {
    if (!clase.dia || !clase.hora_inicio || !clase.hora_fin) return true;
    if (!aulasOcupadas[codigoAula]) return true;
    const inicio = convertirHoraAMinutos(clase.hora_inicio);
    const fin = convertirHoraAMinutos(clase.hora_fin);
    for (const ocupado of aulasOcupadas[codigoAula]) {
        if (ocupado.dia === clase.dia && inicio < ocupado.fin && fin > ocupado.inicio) return false;
    }
    return true;
};

function buscarAulaOptima(clase, aulas, aulasOcupadas, estrictoCapacidad = true) {
    let mejorAula = null;
    let menorScore = Infinity;
    let isOvercapacity = false;

    for (const aula of aulas) {
        if (estrictoCapacidad && aula.capacidad < (clase.num_estudiantes || 1)) continue;

        const exclusividad = aulaEsExclusiva(aula, clase.carrera);
        if (exclusividad === 'bloqueada') continue;

        const carrerasPrioritarias = aulaConPrioridad(aula);
        const carreraNorm = normalizarTexto(clase.carrera);
        const esPrioritaria = carrerasPrioritarias && carrerasPrioritarias.some(c => carreraNorm.includes(c));

        if (carrerasPrioritarias && !esPrioritaria && estrictoCapacidad) continue;
        if (!aulaDisponibleEnHorario(aula.codigo, clase, aulasOcupadas)) continue;

        const diferenciaCapacidad = Math.abs(aula.capacidad - (clase.num_estudiantes || 1));
        const isExclusiveMatch = Object.keys(REGLAS_AULAS.exclusivas).some(key => normalizarTexto(aula.nombre).includes(key));
        const hasBonus = isExclusiveMatch || esPrioritaria;

        const score = diferenciaCapacidad - (hasBonus ? 1000 : 0);

        if (score < menorScore) {
            menorScore = score;
            mejorAula = aula;
            isOvercapacity = aula.capacidad < (clase.num_estudiantes || 1);
        }
    }
    return mejorAula ? { aula: mejorAula, isOvercapacity } : null;
}

async function runSimulation() {
    console.log('🧪 SIMULADOR v2: LÓGICA DE DISTRIBUCIÓN CON PREFERENCIA ESPECIAL\n');

    const aulas = [
        { codigo: 'A1', nombre: 'AULA 1', capacidad: 20 },
        { codigo: 'AUD', nombre: 'SALA DE AUDIENCIAS', capacidad: 25 },
        { codigo: 'L1', nombre: 'LABORATORIO 1', capacidad: 30 },
        { codigo: 'ARQ', nombre: 'AULA 16', capacidad: 35 },
        { codigo: 'MAG', nombre: 'AULA MAGNA', capacidad: 80 }
    ];

    const clases = [
        { id: 1, materia: 'Derecho Procesal', carrera: 'DERECHO', num_estudiantes: 20, dia: 'LUN', hora_inicio: '08:00', hora_fin: '10:00' },
        { id: 2, materia: 'Programación IT', carrera: 'SISTEMAS', num_estudiantes: 20, dia: 'LUN', hora_inicio: '08:00', hora_fin: '10:00' },
        { id: 3, materia: 'Taller de Maquetas', carrera: 'ARQUITECTURA', num_estudiantes: 15, dia: 'LUN', hora_inicio: '08:00', hora_fin: '10:00' },
        { id: 4, materia: 'Clase Masiva', carrera: 'OTROS', num_estudiantes: 120, dia: 'LUN', hora_inicio: '08:00', hora_fin: '10:00' }
    ];

    const aulasOcupadas = {};
    const resultados = [];

    for (const clase of clases) {
        let res = buscarAulaOptima(clase, aulas, aulasOcupadas, true);
        if (!res) res = buscarAulaOptima(clase, aulas, aulasOcupadas, false); // Sobrecupo

        if (res) {
            resultados.push({ clase, aula: res.aula, over: res.isOvercapacity });
            if (!aulasOcupadas[res.aula.codigo]) aulasOcupadas[res.aula.codigo] = [];
            aulasOcupadas[res.aula.codigo].push({
                dia: clase.dia,
                inicio: convertirHoraAMinutos(clase.hora_inicio),
                fin: convertirHoraAMinutos(clase.hora_fin)
            });

            const status = res.isOvercapacity ? '⚠️ SOBRECUPO' : '✅ OK';
            console.log(`${status}: ${clase.materia.padEnd(20)} (${clase.num_estudiantes}) → ${res.aula.nombre} (Cap: ${res.aula.capacidad})`);
        } else {
            console.log(`❌ FALLIDA: ${clase.materia}`);
        }
    }

    console.log('\n🏁 Simulación terminada.');
}

runSimulation();
