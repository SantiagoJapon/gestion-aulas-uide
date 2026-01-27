# 📋 CHEAT SHEET - PRESENTACIÓN RÁPIDA

## 🚀 INICIO RÁPIDO (3 comandos)

```powershell
# 1. Crear directores
cd scripts && .\ejecutar_crear_directores.ps1

# 2. Iniciar backend (Terminal 1)
cd backend && npm start

# 3. Iniciar frontend (Terminal 2)
cd frontend && npm run dev
```

**URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

---

## 🔐 CREDENCIALES

### Admin
```
Email: admin@uide.edu.ec
Password: admin123
```

### Directores (TODOS con password: uide2024)
```
raquel.veintimilla@uide.edu.ec  (Derecho)
lorena.conde@uide.edu.ec        (Informática)
freddy.salazar@uide.edu.ec      (Arquitectura)
domenica.burneo@uide.edu.ec     (Psicología)
franklin.chacon@uide.edu.ec     (Business)
mercy.namicela@uide.edu.ec      (Business - Coord.)
```

---

## 🎬 GUIÓN DE PRESENTACIÓN (5 min)

### 1. Login Admin (30 seg)
- Login → admin@uide.edu.ec / admin123
- Mostrar dashboard completo
- Scrollear hasta mapa de calor global

### 2. Subir Planificación (2 min)
- Logout → Login como director
- Ir a "Subir Planificación"
- Arrastrar Excel
- Click "Subir y Distribuir"
- **ESPERAR** → Ver consola backend (magia)
- Ver resultado: X clases asignadas en Y segundos

### 3. Explorar Mapa de Calor (1 min)
- Scrollear al mapa de calor
- Hacer clic en celdas
- Mostrar tooltip
- Explicar LOW/MEDIUM/HIGH

### 4. Ver como Otros Roles (1 min)
- Login como profesor → Ver su vista limitada
- Login como estudiante → Ver su vista

### 5. Exportar Reportes (30 seg)
- Volver a admin
- Click "Generar Reporte"
- Click botones PDF/Excel

---

## 📊 FORMATO EXCEL REQUERIDO

**Columnas obligatorias**:
```
codigo_materia       | DER-101
nombre_materia       | Derecho Civil I
nivel                | Segundo
paralelo             | A
numero_estudiantes   | 35
horario_dia          | Lunes
horario_inicio       | 08:00
horario_fin          | 10:00
docente              | Dr. Juan Pérez
```

---

## 🎨 NIVELES DEL MAPA DE CALOR

| Nivel | Color | Porcentaje | Significado |
|-------|-------|------------|-------------|
| 🟢 LOW | Verde | < 40% | Baja ocupación |
| 🟡 MEDIUM | Amarillo | 40-69% | Ocupación moderada |
| 🔴 HIGH | Rojo | ≥ 70% | Alta ocupación |
| ⚪ EMPTY | Gris | 0% | Sin clases |

---

## 💡 PUNTOS CLAVE A MENCIONAR

1. **Automatización Total**: Excel → Distribución completa en segundos
2. **IA Gratuita**: Simulated Annealing + k-NN (sin costos)
3. **90-95% Precisión**: Casi todo asignado automáticamente
4. **Roles Diferenciados**: Admin ve todo, director/docente/estudiante su carrera
5. **Visual e Intuitivo**: Mapa de calor con colores claros
6. **Exportable**: PDF y Excel para reportes oficiales
7. **Tiempo Real**: Todo actualizado instantáneamente

---

## ⚡ QUÉ HACE EL SISTEMA AUTOMÁTICAMENTE

```
Excel → Parse → Guardar Clases → DISTRIBUIR AULAS → IA Optimizar → Mostrar Mapa
         |           |                |                    |              |
      30ms         500ms            3s                  1s             inmediato
```

**Total**: < 5 segundos para 100 clases

---

## 🐛 TROUBLESHOOTING RÁPIDO

### Error al cargar MapaCalor.tsx
→ **SOLUCIÓN**: Reiniciar el frontend
```powershell
# Detén con Ctrl + C, luego:
npm run dev
```

### No aparece mapa de calor
→ Subir al menos una planificación primero
→ Hacer click en botón "Actualizar" del mapa

### Backend no conecta BD
→ Verificar PostgreSQL corriendo
→ Verificar credenciales en `backend/.env`

### Excel no se procesa
→ Verificar nombres exactos de columnas
→ Ver consola backend para errores

### Puerto ocupado
```powershell
# Frontend (5173)
npx kill-port 5173

# Backend (3000)
npx kill-port 3000
```

### Errores de compilación frontend
→ Reiniciar: `Ctrl + C` → `npm run dev`
→ Si persiste: `rm -rf node_modules && npm install`

---

## 📞 ENDPOINTS API CLAVE

```
GET  /api/distribucion/estado           - Estado general
GET  /api/distribucion/heatmap          - Datos mapa de calor
GET  /api/distribucion/mi-distribucion  - Vista por rol
GET  /api/distribucion/reporte          - Reporte completo
POST /api/planificaciones/subir         - Subir Excel
```

---

## 🎯 DEMO ALTERNATIVA (Si algo falla)

1. **Mostrar código fuente**:
   - `distribucion.service.js` - Algoritmo
   - `ia-distribucion.service.js` - IA gratuita
   - `MapaCalor.tsx` - Componente React

2. **Mostrar documentación**:
   - `IMPLEMENTACION_COMPLETA_FINAL.md`
   - Explicar arquitectura

3. **Mostrar screenshots** de mapas de calor

---

## ✅ CHECKLIST FINAL

Antes de presentar, verificar:

- [ ] PostgreSQL corriendo
- [ ] Backend iniciado sin errores
- [ ] Frontend cargando en navegador
- [ ] Al menos 1 Excel de planificación listo
- [ ] Directores creados en BD
- [ ] Admin puede hacer login
- [ ] Tienes este cheat sheet abierto

**¡TODO LISTO! 🚀**
