#!/usr/bin/env python3
"""
Crear Excel de Prueba para Planificación
"""

try:
    import openpyxl
    from openpyxl import Workbook
except ImportError:
    print("❌ openpyxl no está instalado")
    print("   Instálalo con: pip install openpyxl")
    exit(1)

# Crear workbook
wb = Workbook()
ws = wb.active
ws.title = 'Planificacion'

# Headers
ws.append([
    'codigo_materia', 
    'nombre_materia', 
    'nivel', 
    'paralelo', 
    'numero_estudiantes', 
    'horario_dia', 
    'horario_inicio', 
    'horario_fin', 
    'docente'
])

# Datos de prueba (3 materias simples)
materias = [
    ['TEST101', 'Materia de Prueba 1', 1, 'A', 30, 'Lunes', '08:00', '10:00', 'Prof. Test'],
    ['TEST102', 'Materia de Prueba 2', 1, 'A', 25, 'Martes', '10:00', '12:00', 'Prof. Test'],
    ['TEST103', 'Materia de Prueba 3', 1, 'B', 35, 'Miércoles', '14:00', '16:00', 'Prof. Test']
]

for materia in materias:
    ws.append(materia)

# Guardar archivo
filename = 'planificacion_PRUEBA_RAPIDA.xlsx'
wb.save(filename)

print(f'✅ Excel creado: {filename}')
print(f'📊 Total materias: {len(materias)}')
print('')
print('📋 CONTENIDO:')
for i, m in enumerate(materias, 1):
    print(f'   {i}. {m[0]} - {m[1]} (Nivel {m[2]}, Paralelo {m[3]})')
print('')
print('✅ Listo para subir!')
