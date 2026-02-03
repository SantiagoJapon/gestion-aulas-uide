const API_BASE = '';
let aulas = [];
let editId = null;

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

function setToken(token) {
  localStorage.setItem('admin_token', token || '');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

function estadoChip(estado) {
  const map = {
    DISPONIBLE: 'green',
    OCUPADA: 'blue',
    MANTENIMIENTO: 'yellow',
    NO_DISPONIBLE: 'red'
  };
  const cls = map[estado] || 'blue';
  return `<span class="chip ${cls}">${estado}</span>`;
}

function renderEdificiosSelect(stats) {
  const sel = document.getElementById('filtroEdificio');
  const opts = [''];
  (stats?.porEdificio || []).forEach(e => {
    if (e.edificio && !opts.includes(e.edificio)) opts.push(e.edificio);
  });
  sel.innerHTML = opts
    .map(v => `<option value="${v}">${v ? v : 'Edificio: Todos'}</option>`)
    .join('');
}

function renderTabla(list) {
  const tbody = document.getElementById('tablaAulas');
  tbody.innerHTML = list
    .map(a => {
      return `<tr>
        <td class="row-code">${a.codigo}</td>
        <td>${a.edificio || ''}</td>
        <td>${a.capacidad}</td>
        <td>${a.piso ?? ''}</td>
        <td>${a.tipo}</td>
        <td>${estadoChip(a.estado)}</td>
        <td class="actions">
          <button class="btn-outline" data-edit="${a.id}">Editar</button>
          <button class="btn-outline danger" data-delete="${a.id}">Eliminar</button>
        </td>
      </tr>`;
    })
    .join('');
  document.getElementById('resumenLista').textContent =
    `Mostrando ${list.length} aulas`;
}

function aplicarFiltros() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const edificio = document.getElementById('filtroEdificio').value;
  const tipo = document.getElementById('filtroTipo').value;
  const estado = document.getElementById('filtroEstado').value;
  let list = aulas;
  if (q) {
    list = list.filter(a =>
      [a.codigo, a.nombre, a.edificio, a.tipo]
        .map(v => String(v || '').toLowerCase())
        .some(s => s.includes(q))
    );
  }
  if (edificio) list = list.filter(a => a.edificio === edificio);
  if (tipo) list = list.filter(a => a.tipo === tipo);
  if (estado) list = list.filter(a => a.estado === estado);
  renderTabla(list);
}

function estadoDistribucionChip(estado) {
  const map = {
    asignada: 'green',
    simulada: 'blue',
    pendiente: 'yellow',
    conflicto: 'red'
  };
  const cls = map[estado] || 'blue';
  return `<span class="chip ${cls}">${estado}</span>`;
}

function renderDistribucionTabla(clases) {
  const tbody = document.getElementById('tablaDistribucion');
  tbody.innerHTML = clases
    .map(c => {
      const hora = c.horario || `${String(c.hora_inicio || '').slice(0,5)} - ${String(c.hora_fin || '').slice(0,5)}`;
      const aula = c.aula || c.aula_asignada || c.aula_simulada || '—';
      return `<tr>
        <td>${c.carrera || ''}</td>
        <td class="row-code">${c.materia || c.subject || ''}</td>
        <td>${c.dia || c.schedule || ''}</td>
        <td>${hora}</td>
        <td>${c.num_estudiantes ?? c.students ?? 0}</td>
        <td>${aula}</td>
        <td>${estadoDistribucionChip(c.estado)}</td>
      </tr>`;
    })
    .join('');
}

const SIMULATED_DISTRIBUCION = [
  { carrera: 'Arquitectura', materia: 'Fundamentos de Diseño', schedule: 'Lun/Mie 07:00-09:00', horario: '07:00 - 09:00', students: 35, aula: 'AULA B4', estado: 'asignada' },
  { carrera: 'Derecho', materia: 'Introducción al Derecho', schedule: 'Mar/Jue 11:00-13:00', horario: '11:00 - 13:00', students: 42, aula: 'SALA DE AUDIENCIAS', estado: 'conflicto' },
  { carrera: 'Administración', materia: 'Ética Empresarial', schedule: 'Lun/Vie 14:00-16:00', horario: '14:00 - 16:00', students: 15, aula: 'AUDITORIO', estado: 'asignada' },
  { carrera: 'Arquitectura', materia: 'Bases Estructurales', schedule: 'Vie 18:00-21:00', horario: '18:00 - 21:00', students: 22, aula: 'AULA C10', estado: 'pendiente' },
  { carrera: 'Derecho', materia: 'Semiótica Visual', schedule: 'Mie 07:00-09:00', horario: '07:00 - 09:00', students: 12, aula: 'AULA C11', estado: 'conflicto' },
  { carrera: 'Arquitectura', materia: 'Diseño de Interiores', schedule: 'Mar 07:00-10:00', horario: '07:00 - 10:00', students: 35, aula: 'AULA C12', estado: 'asignada' },
  { carrera: 'Idiomas', materia: 'Inglés Técnico IV', schedule: 'Mie/Vie 16:00-18:00', horario: '16:00 - 18:00', students: 18, aula: 'LABORATORIO 1', estado: 'asignada' },
  { carrera: 'Derecho', materia: 'Derecho Constitucional', schedule: 'Mar/Jue 08:00-10:00', horario: '08:00 - 10:00', students: 30, aula: 'AULA C13', estado: 'simulada' },
  { carrera: 'Arquitectura', materia: 'Historia de la Arquitectura', schedule: 'Lun 10:00-12:00', horario: '10:00 - 12:00', students: 28, aula: 'AULA C14', estado: 'simulada' },
  { carrera: 'Derecho', materia: 'Derecho Penal', schedule: 'Vie 09:00-11:00', horario: '09:00 - 11:00', students: 25, aula: 'AULA C19 PAPELERA', estado: 'asignada' }
];

async function cargarDistribucionSimulada() {
  const carrera = document.getElementById('filtroCarreraDist').value;
  const base = SIMULATED_DISTRIBUCION.slice();
  const list = carrera ? base.filter(c => c.carrera === carrera) : base;
  document.getElementById('distError').style.display = 'none';
  const total = list.length;
  const asignadas = list.filter(c => c.estado === 'asignada').length;
  const simuladas = list.filter(c => c.estado === 'simulada').length;
  const pendientes = list.filter(c => c.estado === 'pendiente').length;
  document.getElementById('distTotal').textContent = String(total);
  document.getElementById('distAsignadasSim').textContent = String(asignadas + simuladas);
  document.getElementById('distPendientes').textContent = String(pendientes);
  renderDistribucionTabla(list);
}

function activarTab(nombre) {
  const esAulas = nombre === 'aulas';
  document.getElementById('tabAulas').style.display = esAulas ? '' : 'none';
  document.getElementById('tabDistribucion').style.display = esAulas ? 'none' : '';
  const btnA = document.getElementById('tabBtnAulas');
  const btnD = document.getElementById('tabBtnDistribucion');
  if (esAulas) {
    btnA.classList.remove('btn-outline');
    btnD.classList.add('btn-outline');
  } else {
    btnD.classList.remove('btn-outline');
    btnA.classList.add('btn-outline');
  }
}

async function cargarStats() {
  const data = await fetchJSON(`${API_BASE}/api/aulas/stats/summary`, { headers: authHeaders() });
  document.getElementById('totalAulas').textContent = String(data.stats.total);
  document.getElementById('capacidadTotal').textContent = String(data.stats.capacidadTotal);
  const avg = data.stats.total > 0 ? Math.round(data.stats.capacidadTotal / data.stats.total) : 0;
  document.getElementById('promedioCapacidad').textContent = String(avg);
  renderEdificiosSelect(data.stats);
}

async function cargarAulas() {
  const data = await fetchJSON(`${API_BASE}/api/aulas`, { headers: authHeaders() });
  aulas = data.aulas || [];
  aplicarFiltros();
  wireRowActions();
}

function openModal(edit = null) {
  editId = edit ? edit.id : null;
  document.getElementById('modalTitle').textContent = editId ? 'Editar Aula' : 'Nueva Aula';
  document.getElementById('codigo').value = edit?.codigo || '';
  document.getElementById('nombre').value = edit?.nombre || '';
  document.getElementById('edificio').value = edit?.edificio || '';
  document.getElementById('piso').value = edit?.piso ?? '';
  document.getElementById('capacidad').value = edit?.capacidad ?? '';
  document.getElementById('tipo').value = edit?.tipo || 'AULA';
  document.getElementById('estado').value = edit?.estado || 'DISPONIBLE';
  document.getElementById('restriccion_carrera').value = edit?.restriccion_carrera || '';
  document.getElementById('es_prioritaria').value = String(edit?.es_prioritaria ?? false);
  document.getElementById('modalForm').classList.add('open');
}

function closeModal() {
  document.getElementById('modalForm').classList.remove('open');
}

function getFormData() {
  return {
    codigo: document.getElementById('codigo').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    edificio: document.getElementById('edificio').value.trim(),
    piso: document.getElementById('piso').value ? parseInt(document.getElementById('piso').value) : null,
    capacidad: document.getElementById('capacidad').value ? parseInt(document.getElementById('capacidad').value) : null,
    tipo: document.getElementById('tipo').value,
    estado: document.getElementById('estado').value,
    restriccion_carrera: document.getElementById('restriccion_carrera').value.trim() || null,
    es_prioritaria: document.getElementById('es_prioritaria').value === 'true'
  };
}

async function guardarAula() {
  const payload = getFormData();
  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `${API_BASE}/api/aulas/${editId}` : `${API_BASE}/api/aulas`;
  const res = await fetchJSON(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
  closeModal();
  await cargarStats();
  await cargarAulas();
}

async function eliminarAula(id) {
  if (!confirm('¿Eliminar esta aula?')) return;
  await fetchJSON(`${API_BASE}/api/aulas/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  await cargarStats();
  await cargarAulas();
}

function wireRowActions() {
  document.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => {
      const id = parseInt(b.getAttribute('data-edit'));
      const a = aulas.find(x => x.id === id);
      openModal(a);
    };
  });
  document.querySelectorAll('[data-delete]').forEach(b => {
    b.onclick = () => {
      const id = parseInt(b.getAttribute('data-delete'));
      eliminarAula(id).catch(e => alert(e.message));
    };
  });
}

function initEvents() {
  document.getElementById('guardarTokenBtn').onclick = () => {
    setToken(document.getElementById('tokenInput').value.trim());
    cargarStats().catch(() => {});
    cargarAulas().catch(e => alert(e.message));
  };
  document.getElementById('tokenInput').value = getToken();
  document.getElementById('searchInput').oninput = aplicarFiltros;
  document.getElementById('filtroEdificio').onchange = aplicarFiltros;
  document.getElementById('filtroTipo').onchange = aplicarFiltros;
  document.getElementById('filtroEstado').onchange = aplicarFiltros;
  document.getElementById('nuevaAulaBtn').onclick = () => openModal(null);
  document.getElementById('guardarBtn').onclick = () => guardarAula().catch(e => alert(e.message));
  document.getElementById('cancelarBtn').onclick = () => closeModal();
  document.getElementById('tabBtnAulas').onclick = () => activarTab('aulas');
  document.getElementById('tabBtnDistribucion').onclick = () => { window.location.href = '/admin/distribucion'; };
  document.getElementById('filtroCarreraDist').onchange = () => cargarDistribucionBD().catch(() => cargarDistribucionSimulada().catch(() => {}));
  document.getElementById('btnRefrescarDist').onclick = () => cargarDistribucionBD().catch(() => cargarDistribucionSimulada().catch(() => {}));
  const retry = document.getElementById('btnRetryDist');
  if (retry) retry.onclick = () => cargarDistribucionBD().catch(() => cargarDistribucionSimulada().catch(() => {}));
}

async function init() {
  initEvents();
  await cargarStats().catch(() => {});
  await cargarAulas().catch(e => alert(e.message));
  activarTab('distribucion');
  await cargarDistribucionBD().catch(() => cargarDistribucionSimulada().catch(() => {}));
}

document.addEventListener('DOMContentLoaded', init);

async function cargarDistribucionBD() {
  const carrera = document.getElementById('filtroCarreraDist').value;
  const data = await fetchJSON(`${API_BASE}/api/distribucion/cuadro?limit=100`, { headers: authHeaders() });
  const list = carrera ? (data.clases || []).filter(c => (c.carrera || '') === carrera) : (data.clases || []);
  document.getElementById('distError').style.display = 'none';
  const total = list.length;
  const asignadas = list.filter(c => c.estado === 'asignada').length;
  const simuladas = list.filter(c => c.estado === 'simulada').length;
  const pendientes = list.filter(c => c.estado === 'pendiente').length;
  document.getElementById('distTotal').textContent = String(total);
  document.getElementById('distAsignadasSim').textContent = String(asignadas + simuladas);
  document.getElementById('distPendientes').textContent = String(pendientes);
  renderDistribucionTabla(list);
}
